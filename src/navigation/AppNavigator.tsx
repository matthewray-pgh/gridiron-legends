import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { SpinScreen } from '../screens/SpinScreen';
import { TwoMinuteDrillSpinScreen } from '../screens/TwoMinuteDrillSpinScreen';
import { GameScreen } from '../screens/GameScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { DynastyHomeScreen } from '../screens/DynastyHomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { PackOpeningScreen } from '../screens/PackOpeningScreen';
import { HallOfFameScreen } from '../screens/HallOfFameScreen';
import { AppShell } from '../components/AppShell';
import type { RootStackParamList } from './types';
import { Colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          header: () => <AppShell />,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.bgPrimary },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Spin" component={SpinScreen} />
        <Stack.Screen name="TwoMinuteDrillSpin" component={TwoMinuteDrillSpinScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="DynastyHome" component={DynastyHomeScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="PackOpening" component={PackOpeningScreen} />
        <Stack.Screen name="HallOfFame" component={HallOfFameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
