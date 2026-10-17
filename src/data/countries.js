import * as topojson from "topojson-client";
import world from "world-atlas/countries-110m.json";

export const countries =
  topojson.feature(
    world,
    world.objects.countries
  ).features;
