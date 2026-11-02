import { ButtonLink, Icon } from "../ui";

export function NotFound() {
  return (
    <div className="page-head">
      <p className="eyebrow">404</p>
      <h1 className="display">Nothing here</h1>
      <p className="lede">This page doesn't exist, or the website was removed.</p>
      <ButtonLink href="/" variant="rule" style={{ marginTop: "2.5rem", minWidth: 220 }}>
        Back to the dashboard <Icon name="arrow-right" />
      </ButtonLink>
    </div>
  );
}
