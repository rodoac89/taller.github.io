import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface CityWeather {
  name: string;
  region: string;
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  isDay: boolean;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    weather_code: number;
    is_day: number;
  };
}

const CITIES = [
  { name: 'Santiago', region: 'Metropolitana', lat: -33.4489, lon: -70.6693 },
  { name: 'Valparaíso', region: 'Valparaíso', lat: -33.0472, lon: -71.6127 },
  { name: 'Concepción', region: 'Biobío', lat: -36.8270, lon: -73.0498 },
  { name: 'Antofagasta', region: 'Antofagasta', lat: -23.6509, lon: -70.3975 },
  { name: 'Temuco', region: 'Araucanía', lat: -38.7359, lon: -72.5904 },
  { name: 'Puerto Montt', region: 'Los Lagos', lat: -41.4693, lon: -72.9424 },
  { name: 'Iquique', region: 'Tarapacá', lat: -20.2141, lon: -70.1524 },
  { name: 'Punta Arenas', region: 'Magallanes', lat: -53.1548, lon: -70.9113 },
];

@Component({
  selector: 'app-chile-weather',
  templateUrl: './chile-weather.html',
  styleUrl: './chile-weather.css',
})
export class ChileWeather implements OnInit {
  protected readonly cities = signal<CityWeather[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly lastUpdated = signal<Date | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchWeather();
  }

  fetchWeather() {
    this.loading.set(true);
    this.error.set(null);

    const requests = CITIES.map((city) =>
      this.http.get<OpenMeteoResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day`
      )
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const weatherData = responses.map((res, i) => ({
          name: CITIES[i].name,
          region: CITIES[i].region,
          temperature: Math.round(res.current.temperature_2m),
          windSpeed: Math.round(res.current.wind_speed_10m),
          humidity: res.current.relative_humidity_2m,
          weatherCode: res.current.weather_code,
          weatherDescription: this.getWeatherDescription(res.current.weather_code),
          weatherIcon: this.getWeatherIcon(res.current.weather_code, res.current.is_day === 1),
          isDay: res.current.is_day === 1,
        }));
        this.cities.set(weatherData);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el clima. Intenta de nuevo más tarde.');
        this.loading.set(false);
      },
    });
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla con escarcha',
      51: 'Llovizna ligera',
      53: 'Llovizna moderada',
      55: 'Llovizna intensa',
      61: 'Lluvia ligera',
      63: 'Lluvia moderada',
      65: 'Lluvia intensa',
      71: 'Nieve ligera',
      73: 'Nieve moderada',
      75: 'Nieve intensa',
      80: 'Chubascos ligeros',
      81: 'Chubascos moderados',
      82: 'Chubascos intensos',
      95: 'Tormenta eléctrica',
      96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo fuerte',
    };
    return descriptions[code] ?? 'Desconocido';
  }

  private getWeatherIcon(code: number, isDay: boolean): string {
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code <= 2) return isDay ? '⛅' : '☁️';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌦️';
    if (code <= 65) return '🌧️';
    if (code <= 75) return '🌨️';
    if (code <= 82) return '🌧️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  }
}
