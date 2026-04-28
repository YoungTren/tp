export {};

type YMapsGeoObject = object;

type GeoBounds = [number, number, number, number] | [number, number][][];

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void;
      geocode: (
        request: string,
        options?: { results?: number }
      ) => Promise<{
        geoObjects: { get: (i: number) => { geometry: { getCoordinates: () => [number, number] } } | null };
      }>;
      util?: { bounds: { fromPoints: (p: [number, number][]) => GeoBounds } };
      Map: new (
        element: HTMLElement | null,
        state: { center: [number, number]; zoom: number; controls?: string[] }
      ) => {
        destroy: () => void;
        geoObjects: {
          add: (o: YMapsGeoObject) => void;
          removeAll: () => void;
          getBounds: () => GeoBounds | null;
        };
        setBounds: (
          bounds: GeoBounds,
          options?: { checkZoomRange?: boolean; zoomMargin?: number; duration?: number }
        ) => void;
        setCenter: (center: [number, number], zoom?: number, options?: { duration?: number }) => void;
      };
      Placemark: new (
        geometry: [number, number],
        properties?: { balloonContent?: string; hintContent?: string; iconContent?: string },
        options?: { preset?: string; zIndex?: number }
      ) => YMapsGeoObject;
      Polyline: new (
        geometry: [number, number][],
        properties?: { balloonContent?: string },
        options?: {
          strokeColor?: string;
          strokeWidth?: number;
          strokeOpacity?: number;
          zIndex?: number;
        }
      ) => YMapsGeoObject;
      /** Мультимаршрут: пешеходный и др., те же refPoints, что yandex.ru/maps ?rtext & rtt=pd */
      route: (
        points: [number, number][],
        options: {
          mapStateAutoApply?: boolean;
          multiRoute?: boolean;
          routingMode?: "pedestrian" | "masstransit" | "auto" | (string & {});
          searchCoordOrder?: "latlong" | "longlat";
        }
      ) => {
        then: (
          success: (route: {
            options: { set: (o: Record<string, unknown>) => void };
          }) => void,
          err?: (e: unknown) => void
        ) => { then: (a: () => void) => PromiseLike<void> | void };
      };
    };
  }
}
