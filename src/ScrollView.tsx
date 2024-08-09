// for react-native-collapsible-tab-view

// ++++++++++++++++
// Add below to type declaration

// ScrollView: import("react").ForwardRefExoticComponent<Pick<import("react-native/types").ScrollViewProps, "scrollEnabled" | "keyboardDismissMode" | "style" | "children" | "onMoveShouldSetResponderCapture" | "onStartShouldSetResponder" | "overScrollMode" | "contentContainerStyle" | "decelerationRate" | "horizontal" | "invertStickyHeaders" | "keyboardShouldPersistTaps" | "onContentSizeChange" | "onScrollBeginDrag" | "onScrollEndDrag" | "onMomentumScrollEnd" | "onMomentumScrollBegin" | "pagingEnabled" | "removeClippedSubviews" | "showsHorizontalScrollIndicator" | "showsVerticalScrollIndicator" | "stickyHeaderHiddenOnScroll" | "refreshControl" | "snapToInterval" | "snapToOffsets" | "snapToStart" | "snapToEnd" | "stickyHeaderIndices" | "disableIntervalMomentum" | "disableScrollViewPanResponder" | "StickyHeaderComponent" | "hitSlop" | "id" | "onLayout" | "pointerEvents" | "testID" | "nativeID" | "collapsable" | "needsOffscreenAlphaCompositing" | "renderToHardwareTextureAndroid" | "focusable" | "shouldRasterizeIOS" | "isTVSelectable" | "hasTVPreferredFocus" | "tvParallaxProperties" | "tvParallaxShiftDistanceX" | "tvParallaxShiftDistanceY" | "tvParallaxTiltAngle" | "tvParallaxMagnification" | "onMoveShouldSetResponder" | "onResponderEnd" | "onResponderGrant" | "onResponderReject" | "onResponderMove" | "onResponderRelease" | "onResponderStart" | "onResponderTerminationRequest" | "onResponderTerminate" | "onStartShouldSetResponderCapture" | "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel" | "onTouchEndCapture" | "onPointerEnter" | "onPointerEnterCapture" | "onPointerLeave" | "onPointerLeaveCapture" | "onPointerMove" | "onPointerMoveCapture" | "onPointerCancel" | "onPointerCancelCapture" | "onPointerDown" | "onPointerDownCapture" | "onPointerUp" | "onPointerUpCapture" | "accessible" | "accessibilityActions" | "accessibilityLabel" | "aria-label" | "accessibilityRole" | "accessibilityState" | "aria-busy" | "aria-checked" | "aria-disabled" | "aria-expanded" | "aria-selected" | "aria-labelledby" | "accessibilityHint" | "accessibilityValue" | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "aria-valuetext" | "onAccessibilityAction" | "importantForAccessibility" | "aria-hidden" | "aria-live" | "aria-modal" | "role" | "accessibilityLiveRegion" | "accessibilityLabelledBy" | "accessibilityElementsHidden" | "accessibilityViewIsModal" | "onAccessibilityEscape" | "onAccessibilityTap" | "onMagicTap" | "accessibilityIgnoresInvertColors" | "accessibilityLanguage" | "alwaysBounceHorizontal" | "alwaysBounceVertical" | "automaticallyAdjustContentInsets" | "automaticallyAdjustKeyboardInsets" | "automaticallyAdjustsScrollIndicatorInsets" | "bounces" | "bouncesZoom" | "canCancelContentTouches" | "centerContent" | "contentInset" | "contentOffset" | "contentInsetAdjustmentBehavior" | "directionalLockEnabled" | "indicatorStyle" | "maintainVisibleContentPosition" | "maximumZoomScale" | "minimumZoomScale" | "onScrollAnimationEnd" | "pinchGestureEnabled" | "scrollEventThrottle" | "scrollIndicatorInsets" | "scrollToOverflowEnabled" | "scrollsToTop" | "snapToAlignment" | "onScrollToTop" | "zoomScale" | "endFillColor" | "scrollPerfTag" | "nestedScrollEnabled" | "fadingEdgeLength" | "persistentScrollbar"> & {
//         children?: import("react").ReactNode;
//     } & { expandHeader:any, collapsableHeader:any} & import("react").RefAttributes<import("react-native/types").ScrollView>>;

// ++++++++++++++++

// replace the ScrollView.tsx as below

import React, { useState, useCallback } from "react";
import {
  ScrollViewProps,
  ScrollView as RNScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl
} from "react-native";
import Animated from "react-native-reanimated";

import {
  useAfterMountEffect,
  useChainCallback,
  useCollapsibleStyle,
  useScrollHandlerY,
  useSharedAnimatedRef,
  useTabNameContext,
  useTabsContext,
  useUpdateScrollViewContentSize,
} from "./hooks";

//added change to custom header expand
interface CustomScrollViewProps extends Omit<ScrollViewProps, "onScroll"> {
  expandHeader?: any;
  collapseHeader?: any;
}

/**
 * Used as a memo to prevent rerendering too often when the context changes.
 * See: https://github.com/facebook/react/issues/15156#issuecomment-474590693
 */
const ScrollViewMemo = React.memo(
  React.forwardRef<RNScrollView, React.PropsWithChildren<ScrollViewProps>>(
    (props, passRef) => {
      return (
        <Animated.ScrollView
          // @ts-expect-error reanimated types are broken on ref
          ref={passRef}
          {...props}
        />
      );
    }
  )
);

/**
 * Use like a regular ScrollView.
 */
export const ScrollView = React.forwardRef<
  RNScrollView,
  React.PropsWithChildren<CustomScrollViewProps> //change to custom type
>(
  (
    {
      expandHeader,
      collapseHeader,
      contentContainerStyle,
      style,
      onContentSizeChange,
      children,
      refreshControl,
      onScrollBeginDrag,
      ...rest
    },
    passRef
  ) => {
    const name = useTabNameContext();
    const ref = useSharedAnimatedRef<RNScrollView>(passRef);
    const { setRef, contentInset } = useTabsContext();
    const {
      style: _style,
      contentContainerStyle: _contentContainerStyle,
      progressViewOffset,
    } = useCollapsibleStyle();
    const { scrollHandler, enable } = useScrollHandlerY(name);
    // console.log('scrollHandler',scrollHandler)
    const onLayout = useAfterMountEffect(rest.onLayout, () => {
      "worklet";
      // we enable the scroll event after mounting
      // otherwise we get an `onScroll` call with the initial scroll position which can break things
      enable(true);
    });

    React.useEffect(() => {
      setRef(name, ref);
    }, [name, ref, setRef]);

    const scrollContentSizeChange = useUpdateScrollViewContentSize({
      name,
    });

    const scrollContentSizeChangeHandlers = useChainCallback(
      React.useMemo(
        () => [scrollContentSizeChange, onContentSizeChange],
        [onContentSizeChange, scrollContentSizeChange]
      )
    );

    //custom chnages for expanding header back ----------------------------------------------
    const [prevScrollY, setPrevScrollY] = useState(0);
    const [effectTriggered, setEffectTriggered] = useState(false);

    const customScrollEffect = (
      event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
      const { y } = event.nativeEvent.contentOffset;
      if (y <= 0 && prevScrollY > y && !effectTriggered) {
        // console.log("UPPP Custom scroll effect triggered", y);
        // expandHeader();
        setEffectTriggered(true);
      }
      if (y > 0 && effectTriggered) {
        // console.log("DOWN Custom scroll effect triggered", y);
        collapseHeader();
        setEffectTriggered(false);
      }
      setPrevScrollY(y);
    };

    const combinedScrollHandler = useChainCallback(
      React.useMemo(
        () => [customScrollEffect],
        [
          // scrollHandler.onScroll(),
          customScrollEffect,
        ]
      )
    );
    //custom chnages for expanding header back ----------------------------------------------

    let onRefresh = () => {
      console.log("refreshing");
      expandHeader();
    };

      // Refresh control state
      const [refreshing, setRefreshing] = useState(false)

      const handleRefresh = useCallback(() => {
        if (onRefresh) {
          setRefreshing(true)
          onRefresh()
          setRefreshing(false)
        }
      }, [onRefresh])

    const memoRefreshControl = React.useMemo(
      () =>
        refreshControl &&
        React.cloneElement(refreshControl, {
          progressViewOffset,
          ...refreshControl.props,
        }),
      [progressViewOffset, refreshControl]
    );

    const contentInsetValue = useConvertAnimatedToValue(contentInset);

    const memoContentInset = React.useMemo(
      () => ({ top: contentInsetValue }),
      [contentInsetValue]
    );

    const memoContentOffset = React.useMemo(
      () => ({ x: 0, y: -contentInsetValue }),
      [contentInsetValue]
    );

    const memoContentContainerStyle = React.useMemo(
      () => [
        _contentContainerStyle,
        // TODO: investigate types
        contentContainerStyle as any,
      ],
      [_contentContainerStyle, contentContainerStyle]
    );
    const memoStyle = React.useMemo(() => [_style, style], [_style, style]);

    return (
      <ScrollViewMemo
        {...rest}
        onLayout={onLayout}
        ref={ref}
        bouncesZoom={false}
        style={memoStyle}
        contentContainerStyle={memoContentContainerStyle}
        onScroll={combinedScrollHandler}//combinedScrollHandler scrollHandler
        onContentSizeChange={scrollContentSizeChangeHandlers}
        scrollEventThrottle={16}
        contentInset={memoContentInset}
        contentOffset={memoContentOffset}
        automaticallyAdjustContentInsets={false}
        onScrollToTop={handleRefresh}
        refreshControl={  <RefreshControl
          refreshing={false}
          onRefresh={handleRefresh}
          style={{backgroundColor: 'transparent'}}
          progressBackgroundColor='transparent'
          tintColor="transparent" // Ensuring nothing is shown while refreshing
          colors={['transparent']} // Ensuring nothing is shown while refreshing
        />}
        // workaround for: https://github.com/software-mansion/react-native-reanimated/issues/2735
        onMomentumScrollEnd={() => {}}
      >
        {children}
      </ScrollViewMemo>
    );
  }
);
