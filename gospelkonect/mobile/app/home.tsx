import { Redirect } from 'expo-router';

/** Legacy post-login route — the real app lives under the tab group. */
export default function Home() {
  return <Redirect href="/(tabs)" />;
}
