interface BlobDecoratorProps {
  color?: string;
  className?: string;
  opacity?: number;
}

export function BlobDecorator({ color = '#245E55', className = '', opacity = 0.1 }: BlobDecoratorProps) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill={color}
        fillOpacity={opacity}
        d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.2,88.5,-0.9C87,14.4,81.4,28.8,73.2,41.8C65,54.8,54.2,66.4,40.8,73.8C27.4,81.2,11.4,84.4,-4.2,82.5C-19.8,80.6,-35.2,73.6,-48.8,63.8C-62.4,54,-74.2,41.4,-80.8,26.4C-87.4,11.4,-88.8,-5.9,-84.2,-21.8C-79.6,-37.7,-69,-52.2,-55.4,-60.4C-41.8,-68.6,-25.2,-70.5,-9.2,-73.8C6.8,-77.1,30.6,-83.6,44.7,-76.4Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

export function StarDecorator({ className = '' }: { className?: string }) {
  return (
    <span className={`text-brand-mustard ${className}`} aria-hidden>
      ✦
    </span>
  );
}
