import { renderSadnessErrorHtml } from "../components/SadnessErrorPage";

export function renderErrorPage(): string {
  return renderSadnessErrorHtml("error");
}
