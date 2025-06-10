// Polyfill secure random API before any crypto operations
import 'react-native-get-random-values';
import { Base64 } from 'js-base64';

// Polyfill base64 functions required by metadata signing
if (typeof global.atob !== 'function') global.atob = (str) => Base64.decode(str);
if (typeof global.btoa !== 'function') global.btoa = (str) => Base64.encode(str);

// Expo Router entry point (handles root component registration)
import 'expo-router/entry';