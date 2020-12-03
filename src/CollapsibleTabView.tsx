import React from 'react';
import {
  StyleSheet,
  Animated,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import {
  TabView,
  TabBar,
  Route,
  TabViewProps,
  TabBarProps,
  NavigationState,
  SceneRendererProps,
} from 'react-native-tab-view';
import { useDebouncedCallback } from 'use-debounce';
import { CollapsibleContextProvider } from './CollapsibleTabViewContext';
import scrollScene from './scrollScene';
import type { ScrollRef, GetRef } from './types';

export type Props<T extends Route> = Partial<TabViewProps<T>> &
  Pick<TabViewProps<T>, 'onIndexChange' | 'navigationState' | 'renderScene'> & {
    /**
     * Optionally controlled animated value.
     * Default is `new Animated.Value(0)`.
     */
    animatedValue?: Animated.Value;
    /**
     * Header height, default is 0.
     */
    headerHeight?: number;
    /**
     * Tab bar height, default is 49.
     */
    tabBarHeight?: number;
    /**
     * Props passed to the tab bar component.
     */
    tabBarProps?: Partial<TabBarProps<T>>;
    /**
     * Header rendered on top of the tab bar. Defaul is `() => null`
     */
    renderHeader?: () => React.ReactNode;
    /**
     * Styles applied to header and tabbar container.
     */
    headerContainerStyle?: Animated.WithAnimatedValue<ViewStyle>;
    /**
     * Prevent tab press if screen is gliding. Default is `true`
     */
    preventTabPressOnGliding?: boolean;
    /**
     * Disable the snap animation.
     */
    disableSnap?: boolean;
    /**
     * Same as `renderTab` of `TabViewProps`, but with the additional
     * `isGliding` property.
     */
    renderTabBar?: (
      props: SceneRendererProps & {
        navigationState: NavigationState<T>;
        isGliding: boolean;
      }
    ) => React.ReactNode;
    /**
     * Callback fired when the `headerHeight` state value inside
     * `CollapsibleTabView` will be updated in the `onLayout` event
     * from the tab/header container. Useful to call layout animations
     * Example:
     *
     * ```js
     * const onHeaderHeightChange = () => {
     *  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
     * }
     * ```
     */
    onHeaderHeightChange?: () => void;
    /**
     * Percentage of header height to make the snap effect. A number between
     * 0 and 1. Default is 0.5.
     */
    snapThreshold?: number;
    /**
     * How long to wait before initiating the snap effect, in milliseconds.
     * Default is 100
     */
    snapTimeout?: number;
    /**
     * The property from the `routes` map to use for the active route key
     * Default is 'key'
     */
    routeKeyProp?: keyof T;
  };

/**
 * `CollapsibleTabView` wraps the `TabView` and take care of animations /
 * scroll value computations. It should be used with `useCollapsibleScene`.
 */
const CollapsibleTabView = <T extends Route>({
  animatedValue = new Animated.Value(0),
  navigationState: { index, routes },
  renderHeader = () => null,
  headerHeight: initialHeaderHeight = 0,
  tabBarHeight = 49,
  tabBarProps,
  headerContainerStyle,
  preventTabPressOnGliding = true,
  disableSnap = false,
  renderTabBar: customRenderTabBar,
  onHeaderHeightChange,
  snapThreshold = 0.5,
  snapTimeout = 100,
  routeKeyProp = 'key',
  ...tabViewProps
}: React.PropsWithoutRef<Props<T>>): React.ReactElement => {
  const [headerHeight, setHeaderHeight] = React.useState(initialHeaderHeight);
  const scrollY = React.useRef(animatedValue);
  const listRefArr = React.useRef<{ key: T['key']; value?: ScrollRef }[]>([]);
  const listOffset = React.useRef<{ [key: string]: number }>({});
  const isGliding = React.useRef(false);
  /** Used to keep track if the user is actively scrolling */
  const isUserScrolling = React.useRef(false);

  const [canSnap, setCanSnap] = React.useState(false);

  const activateSnapDebounced = useDebouncedCallback(
    () => {
      if (!isUserScrolling.current) {
        setCanSnap(true);
      }
    },
    snapTimeout,
    { trailing: true, leading: false }
  );

  const [translateY, setTranslateY] = React.useState(
    headerHeight === 0
      ? 0
      : scrollY.current.interpolate({
          inputRange: [0, Math.max(headerHeight, 0)],
          outputRange: [0, -headerHeight],
          extrapolateRight: 'clamp',
        })
  );

  React.useEffect(() => {
    const currY = scrollY.current;
    currY.addListener(({ value }) => {
      const curRoute = routes[index][routeKeyProp as keyof Route] as string;
      listOffset.current[curRoute] = value;
      // ensure we activate the snapping when scrollY stops changing (handled by debouncer)
      activateSnapDebounced.callback();
    });
    return () => {
      currY.removeAllListeners();
    };
  }, [routes, index, routeKeyProp, activateSnapDebounced]);

  /**
   * Sync the scroll of unfocused routes to the current focused route,
   * the default behavior is to snap to 0 or the `headerHeight`, it
   * can be disabled with `disableSnap` prop.
   */
  React.useEffect(() => {
    const curRouteKey = routes[index][routeKeyProp as keyof Route] as string;
    const offset = listOffset.current[curRouteKey];

    if (canSnap !== false) {
      setCanSnap(false);
    }
    const newOffset: number | null =
      offset >= 0 && offset <= headerHeight
        ? disableSnap
          ? offset
          : offset <= headerHeight * snapThreshold
          ? 0
          : offset > headerHeight * snapThreshold
          ? headerHeight
          : null
        : null;

    listRefArr.current.forEach((item) => {
      const isCurrentRoute = item.key === curRouteKey;
      const itemOffset = listOffset.current[item.key];

      if (newOffset !== null) {
        if ((disableSnap && !isCurrentRoute) || !disableSnap) {
          if (newOffset !== itemOffset) {
            scrollScene({
              ref: item.value,
              offset: newOffset,
              animated: isCurrentRoute,
            });
          }
        }
        if (!isCurrentRoute) {
          listOffset.current[item.key] = newOffset;
        }
      } else if (
        !isCurrentRoute &&
        (itemOffset < headerHeight || !itemOffset)
      ) {
        scrollScene({
          ref: item.value,
          offset: headerHeight,
          animated: false,
        });
      }
    });
  }, [
    routes,
    index,
    routeKeyProp,
    headerHeight,
    disableSnap,
    snapThreshold,
    canSnap,
  ]);
  const onMomentumScrollBegin = () => {
    isGliding.current = true;
  };

  const onMomentumScrollEnd = () => {
    isGliding.current = false;
  };

  const onScrollBeginDrag = () => {
    isUserScrolling.current = true;
  };

  const onScrollEndDrag = () => {
    isUserScrolling.current = false;
    // make sure we snap if the user keeps his finger in the same position for a while then lifts it
    activateSnapDebounced.callback();
  };

  /**
   * Function to be passed as ref for the scrollable animated
   * component inside the tab scene.
   *
   * One of: Animated.[SrcollView | FlatList]
   *
   * It is exposed in the context.
   */
  const buildGetRef = React.useCallback(
    (routeKey: string): GetRef => (ref) => {
      if (ref) {
        const found = listRefArr.current.find((e) => e.key === routeKey);
        if (!found) {
          listRefArr.current.push({
            key: routeKey,
            value: ref,
          });
        }
      }
    },
    []
  );

  /**
   * Get header height on layout mount/change,
   * if different from the current `headerHeight`,
   * update both the `headerHeight` and the
   * `translateY`.
   */
  const getHeaderHeight = React.useCallback(
    (event: LayoutChangeEvent) => {
      const value = event.nativeEvent.layout.height - tabBarHeight;
      if (Math.round(value * 10) / 10 !== Math.round(headerHeight * 10) / 10) {
        onHeaderHeightChange?.();
        setHeaderHeight(value);
        setTranslateY(
          headerHeight === 0
            ? 0
            : scrollY.current.interpolate({
                inputRange: [0, Math.max(value, 0)],
                outputRange: [0, -value],
                extrapolateRight: 'clamp',
              })
        );
      }
    },
    [headerHeight, onHeaderHeightChange, scrollY, tabBarHeight]
  );

  /**
   *
   * Wraps the tab bar with `Animated.View` to
   * control the translateY property.
   *
   * Render the header with `renderHeader` prop if
   * the header height is greater than 0.
   *
   * Render the default `<TabBar />` with additional
   * `tabBarProps`, or a custom tab bar from the
   * `renderTabBar` prop, inside the Animated wrapper.
   */
  const renderTabBar = (
    props: SceneRendererProps & {
      navigationState: NavigationState<T>;
    }
  ): React.ReactNode => {
    return (
      <Animated.View
        style={[
          styles.headerContainer,
          { transform: [{ translateY }] },
          headerContainerStyle,
        ]}
        onLayout={getHeaderHeight}
      >
        {headerHeight > 0 && renderHeader()}
        {customRenderTabBar ? (
          customRenderTabBar({
            ...props,
            ...tabBarProps,
            isGliding: isGliding.current,
          })
        ) : (
          <TabBar
            {...props}
            {...tabBarProps}
            onTabPress={(event) => {
              if (isGliding.current && preventTabPressOnGliding) {
                event.preventDefault();
              }
              tabBarProps?.onTabPress && tabBarProps.onTabPress(event);
            }}
          />
        )}
      </Animated.View>
    );
  };

  return (
    <CollapsibleContextProvider
      value={{
        activeRouteKey: routes[index][routeKeyProp as keyof Route] as string,
        scrollY: scrollY.current,
        buildGetRef,
        headerHeight,
        tabBarHeight,
        onMomentumScrollBegin,
        onScrollBeginDrag,
        onScrollEndDrag,
        onMomentumScrollEnd,
      }}
    >
      <TabView
        {...tabViewProps}
        navigationState={{ index, routes }}
        renderTabBar={renderTabBar}
      />
    </CollapsibleContextProvider>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    top: 0,
    zIndex: 1,
    position: 'absolute',
    width: '100%',
  },
});

export default CollapsibleTabView;
