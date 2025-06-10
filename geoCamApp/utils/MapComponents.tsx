import React from 'react';
import { Platform } from 'react-native';

// Provide stubbed map components on web to avoid native-only imports
let MapView: React.ComponentType<any>;
let Marker: React.ComponentType<any>;
let UrlTile: React.ComponentType<any>;

if (Platform.OS === 'web') {
  // On web, render nothing for map components
  MapView = () => null;
  Marker = () => null;
  UrlTile = () => null;
} else {
  // On native, use react-native-maps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  UrlTile = RNMaps.UrlTile;
}

export { MapView, Marker, UrlTile };