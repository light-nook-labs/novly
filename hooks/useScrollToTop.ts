import { useRef, useState } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";

export function useScrollToTop(threshold = 500) {
  const [showButton, setShowButton] = useState(false);
  const scrollRef = useRef<any>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setShowButton(e.nativeEvent.contentOffset.y > threshold);
  }

  function scrollToTop() {
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }

  return { scrollRef, showButton, onScroll, scrollToTop };
}
