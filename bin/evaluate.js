#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generateInterviewKit } from '../src/services/pipeline/index.js';

// Load environment variables
dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  return { inputPath, outputPath };
}

async function runBatch() {
  const { inputPath, outputPath } = parseArgs();

  console.log(`=======================================================`);
  console.log(` BATCH EVALUATION PIPELINE (Section 9 Compliance)`);
  console.log(` Input File : ${inputPath}`);
  console.log(` Output File: ${outputPath}`);
  console.log(`=======================================================\n`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file '${inputPath}' does not exist.`);
    process.exit(1);
  }

  let cases = [];
  try {
    const rawData = fs.readFileSync(inputPath, 'utf-8');
    cases = JSON.parse(rawData);
  } catch (err) {
    console.error(`Error reading input JSON file '${inputPath}': ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(cases)) {
    console.error(`Error: Input file must contain a JSON array of case objects.`);
    process.exit(1);
  }

  const generatedAt = new Date().toISOString();
  const results = [];

  for (let idx = 0; idx < cases.length; idx++) {
    const c = cases[idx];
    console.log(`[Batch ${idx + 1}/${cases.length}] Processing case: ID=${c.id}, Days=${c.days}, URL=${c.company_url}`);

    try {
      if (!c.jd && !c.company_url) {
        throw new Error('Case missing both job description and company URL.');
      }

      // Execute full pipeline path
      const kit = await generateInterviewKit({
        jd: c.jd || '',
        company_url: c.company_url || '',
        days: c.days || 5,
        userId: 'batch_runner'
      });

      // Strict Appendix A schema shape
      const formattedKit = {
        source: kit.source,
        company_brief: kit.company_brief,
        role: kit.role,
        questions: kit.questions,
        flashcards: kit.flashcards,
        schedule: kit.schedule,
        coverage: kit.coverage
      };

      results.push({
        id: c.id,
        status: 'ok',
        kit: formattedKit,
        error: null
      });

      console.log(`[Batch ${idx + 1}/${cases.length}] Success for case: ${c.id}\n`);

    } catch (caseErr) {
      console.warn(`[Batch ${idx + 1}/${cases.length}] Failed case: ${c.id} - ${caseErr.message}\n`);
      results.push({
        id: c.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'PIPELINE_ERROR',
          message: caseErr.message || 'Error executing research pipeline for this case.'
        }
      });
    }
  }

  const finalOutput = {
    version: '1.0',
    generated_at: generatedAt,
    kits: results
  };

  // Ensure output directory exists
  const outDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf-8');
  console.log(`=======================================================`);
  console.log(` Batch processing complete! Results written to: ${outputPath}`);
  console.log(` Total Cases: ${cases.length} | Success: ${results.filter(r => r.status === 'ok').length} | Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`=======================================================\n`);
}

runBatch().catch(err => {
  console.error('Fatal batch pipeline error:', err);
  process.exit(1);
});
