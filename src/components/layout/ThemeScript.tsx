import { PREFS_STORAGE_KEY } from "@/store/usePrefs";

/** Before first paint: marks JS as available and applies the persisted theme (no dark→light flash). */
export function ThemeScript() {
  const code = `document.documentElement.classList.add("js");try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_STORAGE_KEY)})||"{}");var t=s&&s.state&&s.state.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
