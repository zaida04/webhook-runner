import express from "express";
import pino from "pino";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { spawn } from "child_process";
import { Hook } from "./types";

const configFile = JSON.parse(readFileSync(join(__dirname, "..", "config.json"), "utf-8")) as { hooks: Hook[] };
const app = express();
const logger = pino();

app.use(express.json());
app.post("/hooks/:id", (req, res) => {
    const hook = configFile.hooks.find((hook) => hook.id === req.params.id);
    if (!hook) {
        res.status(404).json({ error: "Hook not found" });
        return;
    }

    logger.info(`Running hook ${hook.id}`);
    const resolvedDirname = dirname(hook.script_path);
    const spawned = spawn("bash", [hook.script_path], { cwd: resolvedDirname });

    let output = "";
    const handleOutput = (data: string) => {
        console.log(data);
        output += data;
    };

    spawned.stdout?.setEncoding('utf8');
    spawned.stdout?.on('data', handleOutput);
    spawned.stderr?.setEncoding('utf8');
    spawned.stderr?.on('data', handleOutput);

    const handleExit = (code: number) => {
        if (code === 0) {
            return res.status(200).json({ success: true, output });
        } else {
            return res.status(500).json({ error: true, output });
        }
    };

    spawned.on("close", handleExit);
});

app.listen(4332, () => {
    logger.info("Server started on port 4332");
});