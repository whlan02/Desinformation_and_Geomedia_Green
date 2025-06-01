import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';

const InfoComponent = () => {
  const [location, setLocation] = useState(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const fetchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    };

    fetchLocation();
    setDeviceModel(Device.modelName);
    setCurrentTime(new Date().toLocaleString());
  }, []);

  return (
    <View>
      <Text>Device Model: {deviceModel}</Text>
      <Text>Current Time: {currentTime}</Text>
      {location && (
        <Text>
          Coordinates: {location.latitude}, {location.longitude}
        </Text>
      )}
    </View>
  );
};

export default InfoComponent;