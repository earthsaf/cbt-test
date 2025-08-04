// Cross-browser compatible styles
export const userSelect = {
  WebkitUserSelect: 'none', // Safari
  MozUserSelect: 'none', // Firefox
  msUserSelect: 'none', // IE10+/Edge
  userSelect: 'none', // Standard
};

export const fullWidth = {
  width: '-webkit-fill-available', // Chrome, Safari, newer Edge
  width: 'stretch', // Future standard
  width: '-moz-available', // Firefox
  width: 'fill-available', // Standard
};

// Button accessibility mixin
export const accessibleButton = (props = {}) => ({
  '&:focus': {
    outline: '2px solid #4a90e2',
    outlineOffset: '2px',
  },
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  ...props,
});
