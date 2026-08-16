class SdPanel extends HTMLElement {
  connectedCallback() {
    this.classList.add("sd-panel");
    const title = this.getAttribute("title");
    if (
      title &&
      !this.hasAttribute("data-panel-header") &&
      !this.querySelector(".sd-panel__header")
    ) {
      const header = document.createElement("div");
      header.className = "sd-panel__header";
      const label = document.createElement("span");
      label.className = "sd-label";
      label.textContent = title;
      header.append(label);
      this.prepend(header);
    }
  }
}

class SdButton extends HTMLElement {
  private button?: HTMLButtonElement;

  connectedCallback() {
    if (this.button) return;
    this.button = document.createElement("button");
    this.button.className = `sd-button${this.hasAttribute("accent") ? " sd-button--accent" : ""}`;
    const type = this.getAttribute("type");
    this.button.type = type === "submit" || type === "reset" ? type : "button";
    this.button.disabled = this.hasAttribute("disabled");
    while (this.firstChild) this.button.append(this.firstChild);
    this.append(this.button);
  }

  static get observedAttributes() {
    return ["accent", "disabled"];
  }

  attributeChangedCallback(name: string) {
    if (!this.button) return;
    if (name === "disabled") this.button.disabled = this.hasAttribute("disabled");
    if (name === "accent")
      this.button.classList.toggle("sd-button--accent", this.hasAttribute("accent"));
  }
}

export function defineSandustryUI() {
  if (!customElements.get("sd-panel")) customElements.define("sd-panel", SdPanel);
  if (!customElements.get("sd-button")) customElements.define("sd-button", SdButton);
}

if (typeof window !== "undefined") defineSandustryUI();
