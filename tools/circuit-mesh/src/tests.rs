use super::*;
use serde_json::json;

fn fixture(feature: Value) -> (PreparedInput, Vec<u8>) {
    let source =
        serde_json::to_vec(&json!({"type":"FeatureCollection","features":[feature]})).unwrap();
    let input = PreparedInput {
        schema_version: 1,
        origin: Origin {
            longitude: 0.0,
            latitude: 0.0,
        },
        elevation_base: 100.0,
        points: vec![[-20.0, -20.0], [20.0, -20.0], [0.0, 20.0]],
        terrain_grid: None,
        projection_scale: Some([1.0, 1.0]),
        scene_scale: 0.1,
        corridor_metres: 600.0,
        source_hashes: BTreeMap::from([
            ("buildings".into(), sha256(&source)),
            ("context".into(), "a".repeat(64)),
            ("circuit".into(), "b".repeat(64)),
        ]),
        provenance: None,
    };
    (input, source)
}
fn feature(rings: Value, properties: Value) -> Value {
    json!({"type":"Feature","geometry":{"type":"Polygon","coordinates":rings},"properties":properties})
}
fn outer() -> Value {
    json!([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]])
}
fn cap_area(mesh: &Mesh, up: bool) -> f64 {
    mesh.indices
        .chunks_exact(3)
        .filter(|f| {
            if up {
                mesh.vertices[f[0] as usize][4] > 0.99
            } else {
                mesh.vertices[f[0] as usize][4] < -0.99
            }
        })
        .map(|f| {
            let a = mesh.vertices[f[0] as usize];
            let b = mesh.vertices[f[1] as usize];
            let c = mesh.vertices[f[2] as usize];
            f64::from((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])).abs() * 0.5
        })
        .sum()
}
#[test]
fn courtyard_hole_and_flat_normals_survive_indexing() {
    let (input, source) = fixture(feature(
        json!([
            [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
            [[3, 3], [3, 7], [7, 7], [7, 3], [3, 3]]
        ]),
        json!({"height":10,"heightSource":"survey","groundElevation":100}),
    ));
    let mesh = compile(&input, &source).unwrap();
    assert!((cap_area(&mesh.solid, true) - 0.84).abs() < 1e-6);
    assert!((cap_area(&mesh.solid, false) - 0.84).abs() < 1e-6);
    assert_eq!(mesh.solid.indices.len() / 3, 32);
    assert!(mesh.solid.vertices.len() < mesh.solid.indices.len());
    assert!(mesh.solid.vertices.iter().any(|v| v[4] > 0.99));
    assert!(mesh.solid.vertices.iter().any(|v| v[4] < -0.99));
    assert!(mesh.solid.vertices.iter().any(|v| v[4].abs() < 0.01));
    assert_eq!(mesh.counts.solid_feature_count, 1);
    assert_eq!(mesh.counts.footprint_feature_count, 0);
}
#[test]
fn both_outer_windings_retain_area_and_outward_wall_normals() {
    let rings = outer();
    let mut reversed = rings.clone();
    reversed[0].as_array_mut().unwrap().reverse();
    for value in [rings, reversed] {
        let (input, source) = fixture(feature(
            value,
            json!({"height":5,"heightSource":"survey","groundElevation":100}),
        ));
        let c = compile(&input, &source).unwrap();
        assert!((cap_area(&c.solid, true) - 1.0).abs() < 1e-6);
        for v in &c.solid.vertices {
            if v[4].abs() < 0.01 {
                assert!((v[0] - 0.5) * v[3] + (v[2] + 0.5) * v[5] > 0.49);
            }
        }
    }
}
#[test]
fn unknown_height_or_missing_ground_stays_flat_without_invented_volume() {
    for properties in [
        json!({"height":10,"groundElevation":110}),
        json!({"height":null,"heightSource":"survey","groundElevation":110}),
        json!({"height":10,"heightSource":"survey"}),
        json!({"height":-3,"heightSource":"survey","groundElevation":110}),
    ] {
        let (input, source) = fixture(feature(outer(), properties));
        let c = compile(&input, &source).unwrap();
        assert!(c.solid.vertices.is_empty());
        assert_eq!(c.counts.footprint_feature_count, 1);
        let bounds = c.footprint.bounds.unwrap();
        assert!((bounds.max[1] - bounds.min[1]).abs() < 1e-6);
    }
}
#[test]
fn terrain_requires_all_four_cells_and_respects_north_to_south_sampling() {
    let (mut input, source) = fixture(feature(
        outer(),
        json!({"height":5,"heightSource":"survey"}),
    ));
    input.terrain_grid = Some(TerrainGrid {
        bbox: [-20.0, -20.0, 20.0, 20.0],
        columns: 2,
        rows: 2,
        values: vec![Some(110.0), Some(120.0), Some(130.0), Some(140.0)],
    });
    let projection = Projection::new(&input);
    assert_eq!(
        terrain_elevation_at(&input, &projection, 0.0, 0.0),
        Some(125.0)
    );
    assert_eq!(
        terrain_elevation_at(&input, &projection, -20.0, -20.0),
        Some(110.0)
    );
    assert_eq!(terrain_elevation_at(&input, &projection, 21.0, 0.0), None);
    assert_eq!(
        compile(&input, &source).unwrap().counts.solid_feature_count,
        1
    );
    input.terrain_grid.as_mut().unwrap().values[3] = None;
    assert_eq!(
        terrain_elevation_at(&input, &projection, -20.0, -20.0),
        None,
        "even zero-weight missing cells remain missing, matching JS"
    );
    let c = compile(&input, &source).unwrap();
    assert!(c.solid.vertices.is_empty());
    assert_eq!(c.footprint.bounds.unwrap().min[1], 0.006);
}
#[test]
fn ground_attribute_nullish_fallback_and_invalid_attribute_terrain_match_source_rules() {
    for (properties, expected) in [
        (
            json!({"height":5,"heightSource":"survey","groundElevation":null,"altitude_minimale_sol":110}),
            true,
        ),
        (
            json!({"height":5,"heightSource":"survey","groundElevation":"invalid","altitude_minimale_sol":110}),
            false,
        ),
    ] {
        let (input, source) = fixture(feature(outer(), properties));
        let c = compile(&input, &source).unwrap();
        assert_eq!(c.counts.solid_feature_count > 0, expected);
    }
}
#[test]
fn multipolygon_preserves_both_polygons_but_counts_the_feature_once() {
    let value = json!({"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[outer(),[[[12,0],[14,0],[14,2],[12,2],[12,0]]]]},"properties":{"height":4,"heightSource":"survey","groundElevation":100}});
    let (input, source) = fixture(value);
    let c = compile(&input, &source).unwrap();
    assert_eq!(c.counts.feature_count, 1);
    assert_eq!(c.counts.solid_polygon_count, 2);
    assert_eq!(c.solid.indices.len() / 3, 24);
}
#[test]
fn malformed_coordinates_geometry_and_source_hashes_are_rejected() {
    for value in [
        json!({"type":"Feature","geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]},"properties":{}}),
        feature(json!([[[0, 0], [1], [1, 1], [0, 0]]]), json!({})),
        feature(json!([[[0, 0], [200, 0], [1, 1], [0, 0]]]), json!({})),
    ] {
        let (input, source) = fixture(value);
        assert!(compile(&input, &source).is_err());
    }
    let (mut input, source) = fixture(feature(outer(), json!({})));
    input
        .source_hashes
        .insert("buildings".into(), "c".repeat(64));
    assert!(compile(&input, &source).is_err());
    input
        .source_hashes
        .insert("buildings".into(), sha256(&source));
    input.points[0][0] = f64::NAN;
    assert!(compile(&input, &source).is_err());
}
#[test]
fn binary_protocol_and_gzip_are_deterministic_and_have_no_uv_payload() {
    use std::io::Read;
    let (input, source) = fixture(feature(
        outer(),
        json!({"height":5,"heightSource":"survey","groundElevation":100}),
    ));
    let a = compile(&input, &source).unwrap();
    let raw = encode(&a).unwrap();
    assert_eq!(&raw[..8], MAGIC);
    assert_eq!(
        raw.len(),
        32 + a.solid.vertices.len() * 24 + a.solid.indices.len() * 4
    );
    let mut cursor = HEADER_BYTES;
    for mesh in [&a.solid, &a.footprint] {
        for component_range in [0..3, 3..6] {
            for vertex in &mesh.vertices {
                for expected in &vertex[component_range.clone()] {
                    let actual = f32::from_le_bytes(raw[cursor..cursor + 4].try_into().unwrap());
                    assert_eq!(
                        actual.to_bits(),
                        expected.to_bits(),
                        "separate position/normal arrays preserve exact Float32 values"
                    );
                    cursor += 4;
                }
            }
        }
        for expected in &mesh.indices {
            assert_eq!(
                u32::from_le_bytes(raw[cursor..cursor + 4].try_into().unwrap()),
                *expected
            );
            cursor += 4;
        }
    }
    assert_eq!(cursor, raw.len());
    let compressed = gzip(&raw).unwrap();
    assert_eq!(compressed, gzip(&raw).unwrap());
    assert_eq!(&compressed[4..8], &[0, 0, 0, 0]);
    assert_eq!(compressed[9], 255);
    let mut decoded = Vec::new();
    flate2::read::GzDecoder::new(compressed.as_slice())
        .read_to_end(&mut decoded)
        .unwrap();
    assert_eq!(raw, decoded);
    let b = compile(&input, &source).unwrap();
    assert_eq!(raw, encode(&b).unwrap());
}
#[test]
fn corridor_closure_and_exact_boundary_are_included() {
    let points = [[-10.0, 0.0], [10.0, 0.0], [10.0, 10.0]];
    let c = Corridor::new(&points, 1.0).unwrap();
    assert!(c.contains(0.0, -1.0));
    assert!(!c.contains(0.0, -1.0000001));
    assert!(c.contains(0.0, 5.0));
}

#[test]
fn malformed_mesh_indices_and_float32_overflow_are_refused() {
    let mut mesh = Mesh::default();
    mesh.vertices.push([0.0; 6]);
    mesh.indices = vec![0, 0, 1];
    assert!(mesh.validate().is_err());
    mesh.indices = vec![0];
    assert!(mesh.validate().is_err());
    mesh.indices = vec![0, 0, 0];
    mesh.vertices[0][0] = f32::INFINITY;
    assert!(mesh.validate().is_err());
    let (input, source) = fixture(feature(
        outer(),
        json!({"height":1e50,"heightSource":"survey","groundElevation":100}),
    ));
    assert!(compile(&input, &source).is_err());
}

#[test]
fn degenerate_source_faces_can_retain_zero_normals_without_invented_direction() {
    let mut mesh = Mesh::default();
    mesh.triangle(
        [[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [2.0, 0.0, 0.0]],
        false,
        0.006,
    )
    .unwrap();
    mesh.validate().unwrap();
    assert!(
        mesh.vertices
            .iter()
            .all(|v| v[3..].iter().all(|n| *n == 0.0))
    );
}
