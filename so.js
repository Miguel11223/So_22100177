let memorySize = 0;
let osSize = 0;
let remainingMemory = 0;
let partitions = [];
let jobs = [];
let jobQueue = [];
let memoryChart = null;

function createMemory() {
    let memoryInput = parseFloat(document.getElementById('memorySize').value);
    let memoryUnit = document.getElementById('memoryUnit').value;
    memorySize = convertToKB(memoryInput, memoryUnit);

    let osInput = parseFloat(document.getElementById('osSize').value);
    let osUnit = document.getElementById('osUnit').value;
    osSize = convertToKB(osInput, osUnit);

    if (isNaN(memorySize) || isNaN(osSize)) {
        alert("Por favor, ingresa valores válidos para la memoria y el tamaño del sistema operativo.");
        return;
    }

    if (osSize > memorySize * 0.30) {
        alert("El tamaño del sistema operativo no puede exceder el 30% de la memoria total.");
        return;
    }

    remainingMemory = memorySize - osSize;
    updateRemainingMemoryLabel(remainingMemory);

    let partitionInputs = document.getElementById('partitionInputs');
    partitionInputs.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        let label = document.createElement('label');
        label.textContent = `Tamaño de partición ${i + 1}`;

        let input = document.createElement('input');
        input.type = 'number';
        input.placeholder = `Tamaño de partición ${i + 1}`;
        input.id = `partitionSize${i}`;

        let select = document.createElement('select');
        select.id = `partitionUnit${i}`;
        select.addEventListener('change', updatePartitionUnit);
        let options = ['giga', 'mega', 'kilo'];
        options.forEach(optionValue => {
            let option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue.charAt(0).toUpperCase() + optionValue.slice(1) + 'B';
            select.appendChild(option);
        });

        partitionInputs.appendChild(label);
        partitionInputs.appendChild(input);
        partitionInputs.appendChild(select);
        partitionInputs.appendChild(document.createElement('br'));
    }

    let button = document.createElement('button');
    button.textContent = "Guardar Particiones y Generar Gráfica";
    button.onclick = capturePartitionData;
    partitionInputs.appendChild(button);

    if (memorySize > 0) {
        generateChart();
    }
}

function capturePartitionData() {
    let totalPartitionSize = 0;
    partitions = [];

    for (let i = 0; i < 3; i++) {
        let partitionSizeInput = parseFloat(document.getElementById(`partitionSize${i}`).value);
        let partitionUnit = document.getElementById(`partitionUnit${i}`).value;
        let partitionSizeInKB = convertToKB(partitionSizeInput, partitionUnit);

        if (isNaN(partitionSizeInKB)) {
            alert("Por favor, ingresa un tamaño válido para cada partición.");
            return;
        }

        partitions.push({ size: partitionSizeInKB, used: 0 });
        totalPartitionSize += partitionSizeInKB;
    }

    if (totalPartitionSize > remainingMemory) {
        alert("La suma de los tamaños de las particiones excede la memoria restante. Ajusta los tamaños.");
    } else {
        alert("Particiones guardadas correctamente. Generando gráfica...");
        generateChart();
    }
}

function addJob() {
    let jobName = document.getElementById('jobName').value;
    let jobSizeInput = parseFloat(document.getElementById('jobSize').value);
    let jobUnit = document.getElementById('jobUnit').value;
    let jobSizeInKB = convertToKB(jobSizeInput, jobUnit);

    if (isNaN(jobSizeInKB) || jobName === '') {
        alert("Ingresa un nombre y tamaño válidos para el trabajo.");
        return;
    }

    let largestPartitionSize = Math.max(...partitions.map(partition => partition.size));
    if (jobSizeInKB > largestPartitionSize) {
        alert(`El trabajo "${jobName}" es demasiado grande para cualquier partición.`);
        return;
    }

    let existingJobIndex = jobs.findIndex(job => job.name === jobName);
    if (existingJobIndex !== -1) {
        alert(`El trabajo "${jobName}" ya existe y será eliminado.`);
        releaseJob(jobName);
        return;
    }

    let partitionAssigned = false;
    for (let i = 0; i < partitions.length; i++) {
        if (partitions[i].used === 0 && partitions[i].size >= jobSizeInKB) {
            partitions[i].used += jobSizeInKB;
            jobs.push({ name: jobName, size: jobSizeInKB, partitionIndex: i });
            partitionAssigned = true;
            alert(`Trabajo "${jobName}" asignado a la partición ${i + 1}`);
            break;
        }
    }

    if (!partitionAssigned) {
        jobQueue.push({ name: jobName, size: jobSizeInKB });
        updateJobQueue();
        alert(`Trabajo "${jobName}" agregado a la lista de espera.`);
    }

    generateChart();
}

function releaseJob(jobName) {
    let jobIndex = jobs.findIndex(job => job.name === jobName);
    if (jobIndex === -1) return alert("Trabajo no encontrado.");

    let partitionIndex = jobs[jobIndex].partitionIndex;
    partitions[partitionIndex].used -= jobs[jobIndex].size;
    jobs.splice(jobIndex, 1);

    updateJobQueue();
    generateChart();

    setTimeout(() => assignWaitingJob(partitionIndex), 0);
}

function assignWaitingJob(partitionIndex) {
    if (partitions[partitionIndex].used === 0) {
        for (let i = 0; i < jobQueue.length; i++) {
            let waitingJob = jobQueue[i];
            if (partitions[partitionIndex].size >= waitingJob.size) {
                partitions[partitionIndex].used += waitingJob.size;
                jobs.push({ name: waitingJob.name, size: waitingJob.size, partitionIndex });
                jobQueue.splice(i, 1);
                updateJobQueue();
                alert(`Trabajo en espera "${waitingJob.name}" asignado a la partición ${partitionIndex + 1}.`);
                generateChart();
                break;
            }
        }
    }
}

function updatePartitionUnit() {
    generateChart(); 
}

function updateRemainingMemoryLabel(value) {
    document.getElementById('remainingMemoryLabel').textContent = `${value} KB`;
}

function updateJobQueue() {
    let jobQueueList = document.getElementById('jobQueue');
    jobQueueList.innerHTML = '';

    jobQueue.forEach((job, index) => {
        let listItem = document.createElement('li');
        listItem.textContent = `Trabajo ${index + 1} (${job.size} KB)`;
        jobQueueList.appendChild(listItem);
    });
}

function generateChart() {
    if (memoryChart !== null) {
        memoryChart.destroy();
    }

    let ctx = document.getElementById('memoryChart').getContext('2d');
    let labels = ['Sistema Operativo'];
    let data = [osSize];
    let backgroundColors = ['rgba(255, 99, 132, 0.2)'];

    partitions.forEach((partition, index) => {
        labels.push(`Partición ${index + 1}`);
        data.push(partition.used);
        backgroundColors.push('rgba(54, 162, 235, 0.2)');
    });

    memoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Uso de memoria (KB)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace("0.2", "1")),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, stacked: true },
                y: { stacked: true }
            }
        }
    });
}

function convertToKB(value, unit) {
    if (unit === 'giga') return value * 1024 * 1024;
    if (unit === 'mega') return value * 1024;
    return value;
}

document.getElementById('memorySize').addEventListener('input', () => {
    createMemory();
});
