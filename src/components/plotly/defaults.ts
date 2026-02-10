import { Layout, Config, ModeBarDefaultButtons } from "plotly.js-dist-min";

export const DEFAULT_PLOT_LAYOUT: Partial<Layout> = {
  dragmode: false,
  modebar: {
    color: "#808080",
    activecolor: "#009ade",  // Smithsonian blue
  },
  yaxis: {automargin: true}
};

export const DEFAULT_MODEBAR_BUTTONS_TO_REMOVE: ModeBarDefaultButtons[] = ['sendDataToCloud', 'lasso2d', 'select2d', 'autoScale2d'];
export const DEFAULT_PLOT_CONFIG: Partial<Config> = {
  modeBarButtonsToRemove: DEFAULT_MODEBAR_BUTTONS_TO_REMOVE,
  displaylogo: false,
};
