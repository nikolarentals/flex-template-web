import { types as sdkTypes } from '../../util/sdkLoader';
import config from '../../config';

const { LatLng: SDKLatLng, LatLngBounds: SDKLatLngBounds } = sdkTypes;

const placeId = prediction => prediction.id;

const placeAddress = prediction => prediction.place_name;

const placeOrigin = prediction => {
  if (prediction && Array.isArray(prediction.center) && prediction.center.length === 2) {
    // Coordinates in Mapbox features are represented as [longitude, latitude].
    return new SDKLatLng(prediction.center[1], prediction.center[0]);
  }
  return null;
};

const placeBounds = prediction => {
  if (prediction && Array.isArray(prediction.bbox) && prediction.bbox.length === 4) {
    // Bounds in Mapbox features are represented as [minX, minY, maxX, maxY]
    return new SDKLatLngBounds(
      new SDKLatLng(prediction.bbox[3], prediction.bbox[2]),
      new SDKLatLng(prediction.bbox[1], prediction.bbox[0])
    );
  }
  return null;
};

// A list of default predictions that can be shown when the user
// focuses on the autocomplete input without typing a search. This can
// be used to reduce typing and Geocoding API calls for common
// searches.
//
// Example:
//
// [
//   {
//     id: 'any unique id',
//     place_name: 'Place name to show in the autocomplete dropdown',
//     center: [longitude, latitude],
//     bbox: [minX, minY, maxX, maxY],
//   },
// ]
//
// To know which values to set as defaults, log a real prediction
// object from the Geocoding API call and check the values from the
// response.
export const defaultPredictions = [
  // {
  //   id: 'default-helsinki',
  //   place_name: 'Helsinki, Finland',
  //   center: [24.94861, 60.17333],
  //   bbox: [24.82617, 60.075361, 25.313112, 60.297839],
  // },
];

export const GeocoderAttribution = () => null;

/**
 * A forward geocoding (place name -> coordinates) implementation
 * using the Mapbox Geocoding API.
 */
class GeocoderMapbox {
  constructor() {
    this.client = window.mapboxSdk({
      accessToken: window.mapboxgl.accessToken,
    });
  }

  // Public API
  //

  /**
   * Search places with the given name.
   *
   * @param {String} search query for place names
   *
   * @return {Promise<{ search: String, predictions: Array<Object>}>}
   * results of the geocoding, should have the original search query
   * and an array of predictions. The format of the predictions is
   * only relevant for the `getPlaceDetails` function below.
   */
  getPlacePredictions(search) {
    return this.client.geocoding
      .forwardGeocode({
        query: search,
        limit: 5,
        language: [config.locale],
      })
      .send()
      .then(response => {
        return {
          search,
          predictions: response.body.features,
        };
      });
  }

  /**
   * Get the ID of the given prediction.
   */
  getPredictionId(prediction) {
    return placeId(prediction);
  }

  /**
   * Get the address text of the given prediction.
   */
  getPredictionAddress(prediction) {
    return placeAddress(prediction);
  }

  /**
   * Fetch or read place details from the selected prediction.
   *
   * @param {Object} prediction selected prediction object
   *
   * @return {Promise<util.propTypes.place>} a place object
   */
  getPlaceDetails(prediction) {
    return Promise.resolve({
      address: placeAddress(prediction),
      origin: placeOrigin(prediction),
      bounds: placeBounds(prediction),
    });
  }
}

export default GeocoderMapbox;
