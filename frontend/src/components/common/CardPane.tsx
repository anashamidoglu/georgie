import React from "react";
import clsx from "clsx";

interface CardPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: number; // in pixels
  parentRadius?: number; // in pixels, defaults to 20
}

export const CardPane: React.FC<CardPaneProps> = ({
  children,
  className,
  padding = 16,
  parentRadius = 20,
  style,
  ...props
}) => {
  // Apple HIG Concentric Radius Rule: Inner = Parent - Padding
  const innerRadius = Math.max(0, parentRadius - padding);

  return (
    <div
      className={clsx(
        "pane-surface relative overflow-hidden transition-all duration-300",
        className
      )}
      style={{
        padding: `${padding}px`,
        borderRadius: `${parentRadius}px`,
        ...style
      }}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<{ style?: React.CSSProperties & { [key: string]: any } }>;
          return React.cloneElement(element, {
            style: {
              ...(element.props.style || {}),
              "--child-radius": `${innerRadius}px`
            }
          });
        }
        return child;
      })}
    </div>
  );
};
