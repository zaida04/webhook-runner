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

    res.setHeader('Content-Type', 'text/plain');

    spawned.stdout?.setEncoding('utf8');
    spawned.stdout?.on('data', (data) => {
        res.write(data);
    });

    spawned.stderr?.setEncoding('utf8');
    spawned.stderr?.on('data', (data) => {
        res.write(data);
    });

    spawned.on("close", (code) => {
        if (code === 0) {
            res.end("\nHook executed successfully.\n");
        } else {
            res.end("\nHook execution failed.\n");
        }
    });
});

app.listen(4332, () => {
    logger.info("Server started on port 4332");
});
