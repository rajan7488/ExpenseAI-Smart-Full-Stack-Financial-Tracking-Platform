const Tesseract = require("tesseract.js");

exports.scanReceipt = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const result = await Tesseract.recognize(
      req.file.buffer,
      "eng"
    );

    const text = result.data.text;

    res.json({
      extractedText: text,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "OCR failed",
    });
  }
};