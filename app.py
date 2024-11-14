from flask import Flask, request, render_template, send_file
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import os
import zipfile
import shutil

app = Flask(__name__)

# Function to plot violin and save as image
def plot_violin_with_lines(data, ax, title):
    sns.violinplot(data=data, x='treatment', y='Ave_RLN', ax=ax, width=0.8, inner='box', palette=colors)
    treatment_positions = {'Mock': 0, 'ABA': 1}
    for name, group in data.groupby('Accession_ID'):
        if len(group) > 1:
            group = group.sort_values('treatment')
            x_coords = []
            y_coords = []
            for _, row in group.iterrows():
                x_pos = treatment_positions[row['treatment']]
                x_coords.append(x_pos)
                y_coords.append(row['Ave_RLN'])
            ax.plot(x_coords, y_coords, color='gray', alpha=0.5, linewidth=0.7)
            ax.scatter(x_coords, y_coords, color='black', alpha=0.7, s=15, zorder=3)
    
    ax.set_title(title, fontsize=20)
    ax.set_ylim(0, 175)
    ax.set_xlabel('treatment', fontsize=16)
    ax.set_ylabel('Ave_RLN', fontsize=16)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.tick_params(axis='both', which='major', labelsize=14)

# Function to plot beeswarm and save as image
def plot_beeswarm(data, ax, title):
    sns.boxplot(data=data, x='treatment', y='Ave_RLN', ax=ax, width=0.3, palette=colors, showcaps=False, boxprops={'facecolor':'None'}, whiskerprops={'linewidth':0})
    sns.swarmplot(data=data, x='treatment', y='Ave_RLN', ax=ax, palette=colors, size=5, alpha=0.7)
    
    ax.set_title(title, fontsize=20)
    ax.set_ylim(0, 175)
    ax.set_xlabel('treatment', fontsize=16)
    ax.set_ylabel('Ave_RLN', fontsize=16)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.tick_params(axis='both', which='major', labelsize=14)

# Color palette for treatments
colors = {'Mock': '#FF9999', 'ABA': '#66C2A5'}

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # Get the uploaded files
        pheno_file = request.files['pheno_file']
        snp_files = request.files.getlist('snp_files')
        
        # Create a directory for output
        output_base_path = 'output_results'
        if os.path.exists(output_base_path):
            shutil.rmtree(output_base_path)
        os.makedirs(output_base_path, exist_ok=True)
        
        # Read the phenotype data
        pheno = pd.read_csv(pheno_file, sep="\t")
        
        for snp_file in snp_files:
            file_name = snp_file.filename
            allele_data = pd.read_csv(snp_file, sep=",", quotechar='"')
            allele_data.rename(columns={'strain': 'Accession_ID'}, inplace=True)
            snp_pheno = pd.merge(pheno, allele_data[['Accession_ID', 'alt']], on='Accession_ID', how='left')

            if 'alt' in snp_pheno.columns and not snp_pheno['alt'].isnull().all():
                most_common_allele = snp_pheno['alt'].mode()[0]
                snp_pheno['allele'] = np.where(snp_pheno['alt'] == most_common_allele, 'minor', 'major')
            else:
                snp_pheno['allele'] = 'major'

            file_output_path = os.path.join(output_base_path, file_name.replace('.csv', ''))
            os.makedirs(file_output_path, exist_ok=True)

            # Create and save violin plots
            fig, axes = plt.subplots(1, 2, figsize=(30, 15))
            major_data = snp_pheno[snp_pheno['allele'] == 'major']
            minor_data = snp_pheno[snp_pheno['allele'] == 'minor']
            plot_violin_with_lines(major_data, axes[0], 'major (violin)')
            plot_violin_with_lines(minor_data, axes[1], 'minor (violin)')
            fig.suptitle(f'Violin Plots - {file_name.replace(".csv", "")}', fontsize=24)
            handles = [plt.Line2D([0], [0], color=colors['Mock'], lw=4),
                       plt.Line2D([0], [0], color=colors['ABA'], lw=4)]
            labels = ['Mock', 'ABA']
            fig.legend(handles, labels, loc='upper right', title='treatment', fontsize=14)
            violin_output_path = os.path.join(file_output_path, 'violin_plot.png')
            fig.savefig(violin_output_path, dpi=300, bbox_inches='tight')
            plt.close(fig)

            # Create and save beeswarm plots
            fig, axes = plt.subplots(1, 2, figsize=(30, 15))
            plot_beeswarm(major_data, axes[0], 'major (beeswarm)')
            plot_beeswarm(minor_data, axes[1], 'minor (beeswarm)')
            fig.suptitle(f'Beeswarm Plots - {file_name.replace(".csv", "")}', fontsize=24)
            fig.legend(handles, labels, loc='upper right', title='treatment', fontsize=14)
            beeswarm_output_path = os.path.join(file_output_path, 'beeswarm_plot.png')
            fig.savefig(beeswarm_output_path, dpi=300, bbox_inches='tight')
            plt.close(fig)

        # Zip the results
        zip_output_path = 'output_results.zip'
        with zipfile.ZipFile(zip_output_path, 'w') as zipf:
            for root, dirs, files in os.walk(output_base_path):
                for file in files:
                    zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), output_base_path))
        
        return send_file(zip_output_path, as_attachment=True)

    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)