import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import MapView, {Marker} from 'react-native-maps';

function TestMaps(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maps Test</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}>
        <Marker
          coordinate={{latitude: 37.78825, longitude: -122.4324}}
          title="San Francisco"
          description="Test Marker"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  map: {
    flex: 1,
  },
});

export default TestMaps;
