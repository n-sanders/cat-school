import { site } from "../lib/site";

interface Props {
  src: string;
  alt: string;
  /** Hide the source link (its URL may contain the answer) until the answer is revealed. */
  hideSource?: boolean;
  onError?: () => void;
  className?: string;
}

export function ItemImage({ src, alt, hideSource, onError, className }: Props) {
  const credit = site.imageCredit(src);
  return (
    <figure className={`item-image ${className ?? ""}`}>
      <div className="item-image-frame">
        <img src={src} alt={alt} loading="lazy" onError={onError} />
      </div>
      <figcaption className="credit">
        Image:{" "}
        {hideSource ? (
          credit
        ) : (
          <a href={src} target="_blank" rel="noreferrer">
            {credit}
          </a>
        )}
      </figcaption>
    </figure>
  );
}
