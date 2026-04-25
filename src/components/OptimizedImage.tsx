import { useState, useCallback, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: React.ReactNode;
  wrapperClassName?: string;
}

const FALLBACK_GRADIENT = "bg-gradient-to-br from-secondary to-muted";

const OptimizedImage = memo(({
  src,
  alt = "",
  className,
  wrapperClassName,
  fallbackIcon,
  loading = "lazy",
  decoding = "async",
  onError: externalOnError,
  onLoad: externalOnLoad,
  ...props
}: OptimizedImageProps) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setStatus("loaded");
    externalOnLoad?.(e);
  }, [externalOnLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setStatus("error");
    externalOnError?.(e);
  }, [externalOnError]);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {/* Skeleton / shimmer while loading */}
      {status === "loading" && (
        <div className={cn("absolute inset-0 shimmer-bg", FALLBACK_GRADIENT)} />
      )}

      {/* Error fallback */}
      {status === "error" && (
        <div className={cn("absolute inset-0 flex items-center justify-center", FALLBACK_GRADIENT)}>
          {fallbackIcon || (
            <svg className="w-10 h-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          )}
        </div>
      )}

      {/* Actual image */}
      {status !== "error" && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding={decoding as any}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
