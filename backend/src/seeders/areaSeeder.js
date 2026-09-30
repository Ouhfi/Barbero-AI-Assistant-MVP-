import Area from "../models/Area.js";

const areas = [
  "Talborjt",
  "Dakhla",
  "Al Quds",
  "Hay Mohammadi",
  "Al Houda",
  "Tilila",
  "Al Massira",
  "Riad Essalam",
  "Anza",
  "Founty",
  "Haut Founty",
  "Illigh",
  "Charaf",
  "Taddart",
  "Bensergao",
  "Adrar",
  "Tikiouine",
];

const seedAreas = async () => {
  for (const name of areas) {
    await Area.findOrCreate({
      where: { name },
    });
  }

  console.log("Areas seeded successfully");
};

export default seedAreas;