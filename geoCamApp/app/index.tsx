import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ImageBackground } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Define SVG strings directly
const cameraIconXml = `<svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m6.23319 5.83404.44526-2.22627c.18697-.93485 1.0078-1.60777 1.96116-1.60777h6.72079c.9534 0 1.7742.67292 1.9612 1.60777l.4452 2.22627c.1424.71201.6823 1.27824 1.3867 1.45435 1.6729.41822 2.8465 1.9213 2.8465 3.64571v7.0659c0 2.2091-1.7909 4-4 4h-12c-2.20914 0-4-1.7909-4-4v-7.0659c0-1.72441 1.17357-3.22749 2.84645-3.64571.70443-.17611 1.24434-.74234 1.38674-1.45435z"/><circle cx="12" cy="14" r="4"/><path d="m11 6h2"/></g></svg>`;

const galleryIconXml = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m0 0h24v24h-24z" fill="#fff" opacity="0"/><g fill="#fff"><path d="m18 3h-12a3 3 0 0 0 -3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-12a3 3 0 0 0 -3-3zm-12 2h12a1 1 0 0 1 1 1v8.36l-3.2-2.73a2.77 2.77 0 0 0 -3.52 0l-7.28 6.07v-11.7a1 1 0 0 1 1-1z"/><circle cx="8" cy="8.5" r="1.5"/></g></svg>`;

const verifyIconXml = `<svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg"><g style="stroke:#fff;stroke-width:4;fill:none;fill-rule:evenodd;stroke-linecap:round;stroke-linejoin:round" transform="translate(2 2)"><path d="m40 80c22.09139 0 40-17.90861 40-40s-17.90861-40-40-40-40 17.90861-40 40 17.90861 40 40 40z"/><path d="m96 96-27.5045451-27.5045451"/></g></svg>`;

export default function MainMenu() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <Text style={styles.title}>GeoCam</Text>
      
      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/camera')}
          >
            <SvgXml xml={cameraIconXml} width={30} height={30} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/gallery')}
          >
            <SvgXml xml={galleryIconXml} width={30} height={30} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/verify')}
          >
            <SvgXml xml={verifyIconXml} width={30} height={30} />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginTop: windowHeight * 0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 25,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    padding: 20,
    borderRadius: 25,
    width: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  button: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});