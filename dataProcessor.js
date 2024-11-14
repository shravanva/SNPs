class DataProcessor {
    static async processFiles(phenoFile, snpFiles) {
        const phenoData = await this.parseTSV(phenoFile);
        const results = [];

        for (const snpFile of snpFiles) {
            const alleleData = await this.parseCSV(snpFile);
            const processedData = this.processPhenoAndSnpData(phenoData, alleleData);
            
            results.push({
                fileName: snpFile.name,
                majorData: processedData.filter(d => d.allele === 'major'),
                minorData: processedData.filter(d => d.allele === 'minor')
            });
        }

        return results;
    }

    static parseTSV(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                delimiter: '\t',
                complete: (results) => resolve(results.data)
            });
        });
    }

    static parseCSV(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                complete: (results) => resolve(results.data)
            });
        });
    }

    static processPhenoAndSnpData(phenoData, alleleData) {
        // Rename strain to Accession_ID in allele data
        const processedAlleleData = alleleData.map(row => ({
            ...row,
            Accession_ID: row.strain
        }));

        // Merge data
        const mergedData = phenoData.map(pheno => {
            const allele = processedAlleleData.find(a => a.Accession_ID === pheno.Accession_ID);
            return {
                ...pheno,
                alt: allele ? allele.alt : null
            };
        });

        // Determine allele type
        const altValues = mergedData.map(row => row.alt).filter(Boolean);
        const mostCommonAllele = this.mode(altValues);

        return mergedData.map(row => ({
            ...row,
            allele: row.alt === mostCommonAllele ? 'minor' : 'major'
        }));
    }

    static mode(arr) {
        return arr.sort((a,b) =>
            arr.filter(v => v === a).length - arr.filter(v => v === b).length
        ).pop();
    }
}