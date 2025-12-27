import express from "express";

const app = express();

app.get("/", (_, res) => res.status(200).send("OK"));
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/healthz", (_, res) => res.status(200).send("OK"));

const port = parseInt(process.env.PORT || "5000", 10);

app.listen(port, "0.0.0.0", () => {
  console.log("PROMOTION MODE — health checks only");
});
