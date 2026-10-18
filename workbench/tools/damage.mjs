#!/usr/bin/env node
import {calculateRow} from './calculator.mjs';
import {runBatch} from './batch-io.mjs';
await runBatch(calculateRow);
