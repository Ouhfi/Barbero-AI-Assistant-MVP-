import Area from "../models/Area.js";

export const GetArea = async (req, res) => {
  try {
    const areas = await Area.findAll({
      order: [["name", "ASC"]],
    });

    res.status(200).json(areas);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
};
