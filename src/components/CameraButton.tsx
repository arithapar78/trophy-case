"use client";

import { useRef } from "react";

// The big round camera button at the bottom of the screen.
//
// It's a hidden <input type="file" capture="environment">. On a phone that
// opens the camera straight away; on a laptop it opens the file picker. No
// camera library, no permissions code of our own — the browser does it.
//
// `capture` is a hint, not a guarantee: iOS shows a small menu offering Take
// Photo or Photo Library, which is what people expect anyway.

export default function CameraButton({
  onPhotoChosen,
}: {
  onPhotoChosen: (photo: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const photo = event.target.files?.[0];
          if (photo) onPhotoChosen(photo);
          // Clear it, so picking the same photo twice in a row still fires
          // a change event the second time.
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Take a photo of an achievement"
        className="tappable flex h-[68px] w-[68px] items-center justify-center rounded-full bg-app-accent shadow-lg ring-4 ring-app-bg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-app-accent-text"
          aria-hidden="true"
        >
          <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
    </>
  );
}
