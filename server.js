import express from 'express';
import fileUpload from 'express-fileupload';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(fileUpload());
app.use(express.static('public'));

// Process TSV/CSV data
function processData(fileContent, delimiter) {
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: delimiter
    });
}

// Process phenotype and SNP data
function processPhenoAndSnpData(phenoData, alleleData) {
    // Rename strain to Accession_ID in allele data
    const processedAlleleData = alleleData.map(row => ({
        ...row,
        Accession_ID: row.strain
    }));

    // Merge phenotype and allele data
    const mergedData = phenoData.map(pheno => {
        const allele = processedAlleleData.find(a => a.Accession_ID === pheno.Accession_ID);
        return {
            ...pheno,
            alt: allele ? allele.alt : null
        };
    });

    // Determine allele type (major/minor)
    const altValues = mergedData.map(row => row.alt).filter(Boolean);
    const mostCommonAllele = mode(altValues);
    
    return mergedData.map(row => ({
        ...row,
        allele: row.alt === mostCommonAllele ? 'minor' : 'major'
    }));
}

// Helper function to calculate mode
function mode(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.post('/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.pheno_file || !req.files.snp_files) {
            return res.status(400).send('Please upload all required files');
        }

        const phenoFile = req.files.pheno_file;
        const snpFiles = Array.isArray(req.files.snp_files) 
            ? req.files.snp_files 
            : [req.files.snp_files];

        // Process phenotype data
        const phenoData = processData(phenoFile.data.toString(), '\t');

        // Process each SNP file and prepare plot data
        const processedData = [];
        for (const snpFile of snpFiles) {
            const alleleData = processData(snpFile.data.toString(), ',');
            const mergedData = processPhenoAndSnpData(phenoData, alleleData);
            
            // Split data by allele type
            const majorData = mergedData.filter(row => row.allele === 'major');
            const minorData = mergedData.filter(row => row.allele === 'minor');

            processedData.push({
                fileName: snpFile.name,
                majorData,
                minorData
            });
        }

        // Send processed data back to client for plotting
        res.json({
            success: true,
            data: processedData
        });

    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).send('An error occurred during file processing');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});