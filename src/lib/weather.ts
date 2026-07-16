export type Weather = {
	temperature: number;
	apparentTemperature: number;
	code: number;
	description: string;
	isDay: boolean;
	high: number;
	low: number;
};

export type GeoResult = {
	name: string;
	admin1?: string;
	country?: string;
	latitude: number;
	longitude: number;
};

const WEATHER_CODES: Record<number, string> = {
	0: 'Clear sky',
	1: 'Mainly clear',
	2: 'Partly cloudy',
	3: 'Overcast',
	45: 'Fog',
	48: 'Rime fog',
	51: 'Light drizzle',
	53: 'Drizzle',
	55: 'Dense drizzle',
	56: 'Freezing drizzle',
	57: 'Freezing drizzle',
	61: 'Light rain',
	63: 'Rain',
	65: 'Heavy rain',
	66: 'Freezing rain',
	67: 'Freezing rain',
	71: 'Light snow',
	73: 'Snow',
	75: 'Heavy snow',
	77: 'Snow grains',
	80: 'Light showers',
	81: 'Showers',
	82: 'Violent showers',
	85: 'Snow showers',
	86: 'Snow showers',
	95: 'Thunderstorm',
	96: 'Thunderstorm w/ hail',
	99: 'Thunderstorm w/ hail'
};

export function weatherEmoji(code: number, isDay: boolean): string {
	if (code === 0) return isDay ? '☀️' : '🌙';
	if (code === 1 || code === 2) return isDay ? '🌤️' : '☁️';
	if (code === 3) return '☁️';
	if (code === 45 || code === 48) return '🌫️';
	if (code >= 51 && code <= 67) return '🌧️';
	if (code >= 71 && code <= 77) return '❄️';
	if (code >= 80 && code <= 82) return '🌦️';
	if (code >= 85 && code <= 86) return '🌨️';
	if (code >= 95) return '⛈️';
	return '🌡️';
}

export async function searchLocation(query: string): Promise<GeoResult[]> {
	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
		query
	)}&count=5&language=en&format=json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('Location search failed.');
	const data = (await res.json()) as { results?: GeoResult[] };
	return data.results ?? [];
}

export async function fetchWeather(latitude: number, longitude: number): Promise<Weather> {
	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		current: 'temperature_2m,apparent_temperature,is_day,weather_code',
		daily: 'temperature_2m_max,temperature_2m_min',
		timezone: 'auto',
		forecast_days: '1'
	});
	const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('Weather fetch failed.');
	const data = (await res.json()) as {
		current: {
			temperature_2m: number;
			apparent_temperature: number;
			is_day: number;
			weather_code: number;
		};
		daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
	};

	const code = data.current.weather_code;
	return {
		temperature: Math.round(data.current.temperature_2m),
		apparentTemperature: Math.round(data.current.apparent_temperature),
		code,
		description: WEATHER_CODES[code] ?? 'Unknown',
		isDay: data.current.is_day === 1,
		high: Math.round(data.daily.temperature_2m_max[0]),
		low: Math.round(data.daily.temperature_2m_min[0])
	};
}
