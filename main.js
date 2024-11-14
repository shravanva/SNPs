document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phenoFile = document.getElementById('pheno_file').files[0];
    const snpFiles = Array.from(document.getElementById('snp_files').files);
    
    try {
        document.getElementById('results').innerHTML = '<h3>Processing data and generating plots...</h3>';
        
        // Process the files client-side
        const processedData = await DataProcessor.processFiles(phenoFile, snpFiles);
        await processAndDownload(processedData);
        
        document.getElementById('results').innerHTML += '<p>Plots have been generated and downloaded!</p>';
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('results').innerHTML = `
            <p style="color: red;">An error occurred during processing</p>
        `;
    }
});

async function processAndDownload(processedData) {
    const zip = new JSZip();
    
    for (const fileData of processedData) {
        const majorViolinDiv = document.createElement('div');
        majorViolinDiv.className = 'plot-container';
        majorViolinDiv.id = `major-violin-${fileData.fileName}`;
        
        const minorViolinDiv = document.createElement('div');
        minorViolinDiv.className = 'plot-container';
        minorViolinDiv.id = `minor-violin-${fileData.fileName}`;
        
        const majorBeeswarmDiv = document.createElement('div');
        majorBeeswarmDiv.className = 'plot-container';
        majorBeeswarmDiv.id = `major-beeswarm-${fileData.fileName}`;
        
        const minorBeeswarmDiv = document.createElement('div');
        minorBeeswarmDiv.className = 'plot-container';
        minorBeeswarmDiv.id = `minor-beeswarm-${fileData.fileName}`;
        
        document.getElementById('results').appendChild(majorViolinDiv);
        document.getElementById('results').appendChild(minorViolinDiv);
        document.getElementById('results').appendChild(majorBeeswarmDiv);
        document.getElementById('results').appendChild(minorBeeswarmDiv);

        await createViolinPlot(fileData.majorData, `Major Allele - Violin Plot`, majorViolinDiv.id);
        await createViolinPlot(fileData.minorData, `Minor Allele - Violin Plot`, minorViolinDiv.id);
        await createBeeswarmPlot(fileData.majorData, `Major Allele - Beeswarm Plot`, majorBeeswarmDiv.id);
        await createBeeswarmPlot(fileData.minorData, `Minor Allele - Beeswarm Plot`, minorBeeswarmDiv.id);

        const majorViolinImage = await Plotly.toImage(majorViolinDiv.id, {format: 'png', width: 800, height: 600});
        const minorViolinImage = await Plotly.toImage(minorViolinDiv.id, {format: 'png', width: 800, height: 600});
        const majorBeeswarmImage = await Plotly.toImage(majorBeeswarmDiv.id, {format: 'png', width: 800, height: 600});
        const minorBeeswarmImage = await Plotly.toImage(minorBeeswarmDiv.id, {format: 'png', width: 800, height: 600});
        
        zip.file(`${fileData.fileName.replace('.csv', '')}/major_violin.png`, majorViolinImage.split(',')[1], {base64: true});
        zip.file(`${fileData.fileName.replace('.csv', '')}/minor_violin.png`, minorViolinImage.split(',')[1], {base64: true});
        zip.file(`${fileData.fileName.replace('.csv', '')}/major_beeswarm.png`, majorBeeswarmImage.split(',')[1], {base64: true});
        zip.file(`${fileData.fileName.replace('.csv', '')}/minor_beeswarm.png`, minorBeeswarmImage.split(',')[1], {base64: true});
    }

    const content = await zip.generateAsync({type: 'blob'});
    saveAs(content, 'snp-phenotype-plots.zip');
}