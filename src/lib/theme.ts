export const THEME_STORAGE_KEY = "splitbook:theme";

/** Inline boot script for root layout — prevents theme flash. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;
