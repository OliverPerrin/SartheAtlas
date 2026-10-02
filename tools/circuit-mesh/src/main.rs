use sarthe_circuit_mesh::{PreparedInput, compile, encode, gzip, manifest, sha256};
use std::{collections::BTreeMap, env, fs, path::Path};
fn run() -> Result<(), String> {
    let mut args = BTreeMap::new();
    let mut values = env::args().skip(1);
    while let Some(key) = values.next() {
        if ![
            "--input",
            "--buildings",
            "--output",
            "--manifest",
            "--binary-url",
            "--gzip-output",
        ]
        .contains(&key.as_str())
        {
            return Err(format!("Unknown argument: {key}"));
        }
        let value = values
            .next()
            .ok_or_else(|| format!("Missing value for {key}"))?;
        if args.insert(key.clone(), value).is_some() {
            return Err(format!("Duplicate argument: {key}"));
        }
    }
    let required = |key: &str| {
        args.get(key)
            .ok_or_else(|| format!("Required argument {key}"))
    };
    let prepared =
        fs::read(required("--input")?).map_err(|e| format!("Read prepared input: {e}"))?;
    let input: PreparedInput =
        serde_json::from_slice(&prepared).map_err(|e| format!("Invalid prepared input: {e}"))?;
    let source =
        fs::read(required("--buildings")?).map_err(|e| format!("Read original buildings: {e}"))?;
    let compiled = compile(&input, &source)?;
    let binary = encode(&compiled)?;
    let compressed = gzip(&binary)?;
    let output = required("--output")?;
    let manifest_path = required("--manifest")?;
    let gzip_output = required("--gzip-output")?;
    let default_url = format!(
        "/data/{}",
        Path::new(gzip_output)
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid output filename")?
    );
    let url = args.get("--binary-url").unwrap_or(&default_url);
    let json = manifest(
        &input,
        &compiled,
        &binary,
        &compressed,
        url,
        &sha256(&prepared),
    );
    let mut json_bytes = serde_json::to_vec_pretty(&json).map_err(|e| e.to_string())?;
    json_bytes.push(b'\n');
    fs::write(output, &binary).map_err(|e| format!("Write mesh: {e}"))?;
    fs::write(gzip_output, &compressed).map_err(|e| format!("Write gzip: {e}"))?;
    fs::write(manifest_path, json_bytes).map_err(|e| format!("Write manifest: {e}"))?;
    println!(
        "Compiled {} of {} source features: {} solid / {} footprint triangles; {} bytes",
        compiled.counts.feature_count,
        compiled.counts.source_feature_count,
        compiled.solid.indices.len() / 3,
        compiled.footprint.indices.len() / 3,
        binary.len()
    );
    Ok(())
}
fn main() {
    if let Err(error) = run() {
        eprintln!("circuit-mesh: {error}");
        std::process::exit(1);
    }
}
