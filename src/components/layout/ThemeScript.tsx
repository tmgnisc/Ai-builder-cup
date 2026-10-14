import { PREFS_STORAGE_KEY } from "@/store/usePrefs";

/** Applies the persisted theme before first paint to avoid a dark→light flash. */
export function ThemeScript() {
  const code = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_STORAGE_KEY)})||"{}");var t=s&&s.state&&s.state.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
