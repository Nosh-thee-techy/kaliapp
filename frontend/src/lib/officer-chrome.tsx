import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useNavigate } from "@tanstack/react-router";

export type QueueShortcutHandlers = {
  moveDown: () => void;
  moveUp: () => void;
  assessSelected: () => void;
};

type OfficerChromeContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  focusSearch: () => void;
  registerQueueShortcuts: (handlers: QueueShortcutHandlers | null) => void;
};

const OfficerChromeContext = createContext<OfficerChromeContextValue | null>(null);

export function OfficerChromeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueueShortcutHandlers | null>(null);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const registerQueueShortcuts = useCallback((handlers: QueueShortcutHandlers | null) => {
    queueRef.current = handlers;
  }, []);

  useEffect(() => {
    let gPending = false;
    let gTimer: ReturnType<typeof setTimeout> | undefined;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPending = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPending = false;
        }, 1200);
        return;
      }

      if (gPending) {
        gPending = false;
        clearTimeout(gTimer);
        if (e.key === "d") {
          e.preventDefault();
          navigate({ to: "/dashboard" });
        } else if (e.key === "l") {
          e.preventDefault();
          navigate({ to: "/logs" });
        } else if (e.key === "f") {
          e.preventDefault();
          navigate({ to: "/farmer" });
        }
        return;
      }

      if (e.key === "j") {
        e.preventDefault();
        queueRef.current?.moveDown();
      } else if (e.key === "k") {
        e.preventDefault();
        queueRef.current?.moveUp();
      } else if (e.key === "Enter") {
        queueRef.current?.assessSelected();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(gTimer);
    };
  }, [focusSearch, navigate]);

  return (
    <OfficerChromeContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchInputRef,
        focusSearch,
        registerQueueShortcuts,
      }}
    >
      {children}
    </OfficerChromeContext.Provider>
  );
}

export function useOfficerChrome() {
  const ctx = useContext(OfficerChromeContext);
  if (!ctx) throw new Error("useOfficerChrome must be used within OfficerChromeProvider");
  return ctx;
}

export function useOfficerChromeOptional() {
  return useContext(OfficerChromeContext);
}
