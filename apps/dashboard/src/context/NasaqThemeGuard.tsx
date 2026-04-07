import { ReactNode } from "react";

type NasaqThemeGuardProps = {
  children: ReactNode;
};

export function NasaqThemeGuard({ children }: NasaqThemeGuardProps) {
  return <>{children}</>;
}
