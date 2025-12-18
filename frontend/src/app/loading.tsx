import { LoadInScreen } from "@/components/loading/LoadInScreen";

/**
 * Next.js route loading UI
 * 
 * This component is automatically shown by Next.js during route transitions.
 * For app-level initialization, use AppWrapper instead.
 */
export default function Loading() {
  return (
    <LoadInScreen
      isReady={false}
      minDurationMs={1500}
      messages={[
        "Loading page...",
        "Fetching data...",
        "Almost there...",
      ]}
    />
  );
}

