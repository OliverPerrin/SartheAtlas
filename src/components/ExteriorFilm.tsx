import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { ExteriorFilm as Film } from "../data/references.ts";
import "./ExteriorFilm.css";

export default function ExteriorFilm({ film }: { film: Film }) {
  const [started, setStarted] = useState(false);
  return (
    <div className="exterior-film" data-presentation="artist-film">
      {started ? (
        <iframe
          title={film.title}
          src={`https://www.youtube-nocookie.com/embed/${film.id}?autoplay=1&mute=1&playsinline=1&rel=0&origin=${encodeURIComponent(location.origin)}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          <img
            src={film.poster}
            alt={`${film.title} rendered by ${film.author}`}
            decoding="async"
          />
          <button className="film-play" onClick={() => setStarted(true)}>
            <Play size={22} fill="currentColor" />
            <span>
              Play artist’s studio film
              <small>Rendered turntable · {film.author}</small>
            </span>
          </button>
        </>
      )}
      <a
        className="film-source"
        href={`https://www.youtube.com/watch?v=${film.id}`}
        target="_blank"
        rel="noreferrer"
      >
        Watch on YouTube <ExternalLink size={11} />
      </a>
    </div>
  );
}
