document.addEventListener("DOMContentLoaded", function () {
    const startButton = document.getElementById("startButton");
    const contianer = document.querySelector(".container");
    const quizSelectInput = document.getElementById("quizSelectInput");

    startButton.addEventListener("click", (e) => {
        function parseLatex(latexOutPutPtag, h4) {
            textAreaValue = h4.value;
            latexOutPutPtag.innerHTML = textAreaValue;
            convert(textAreaValue, latexOutPutPtag);
        }

        const quizSelectInputValue = quizSelectInput.value;
       
        const eventSource = new EventSource(
            `/events?quizId=${quizSelectInputValue}`
        );
        const loadingSpinner = document.querySelector(".spinner-border");
        e.target.innerHTML = "Stop Processing";
        loadingSpinner.classList.remove("d-none");

        eventSource.addEventListener("message", function (event) {
            var imageData = JSON.parse(event.data);
            console.log(imageData);
            let progressPtag = document.createElement("p");
            progressPtag.innerText = `Progress: ${imageData.process_progress}%`;
            let img = document.createElement("img");
            img.classList.add("border", "border-dark", "mb-3");
            let latexOutputPtag = document.createElement("div");
            img.setAttribute("src", imageData.image_src);
            let h4 = document.createElement("textarea");
            let h1 = document.createElement("h1");
            h4.value = imageData.latex_equation;
            h1.innerHTML = imageData.row_id;
            h4.classList.add("p-2", "col-12");
            latexOutputPtag.classList.add("p-1", "col-12", "mb-2");
            let quizContainer = document.createElement("div");
            quizContainer.classList.add(
                "row",
                "mb-5",
                "border",
                "border-dark",
                "p-3",
                "container-fluid"
            );
            let parentContainer = document.createElement("div");
            parentContainer.classList.add(
                "d-flex",
                "flex-column",
                "justify-content-center",
                "align-items-center"
            );
            parentContainer.append(quizContainer);
            quizContainer.append(h1, img, h4, latexOutputPtag, progressPtag);
            contianer.append(quizContainer);

            var scrollTop =
                (document.documentElement &&
                    document.documentElement.scrollTop) ||
                document.body.scrollTop;
            var scrollHeight =
                (document.documentElement &&
                    document.documentElement.scrollHeight) ||
                document.body.scrollHeight;
            var clientHeight =
                document.documentElement.clientHeight || window.innerHeight;
            window.scrollTo(0, scrollHeight - clientHeight);

            setTimeout(() => {
                parseLatex(latexOutputPtag, h4);
            }, 1000);
        });

        eventSource.onerror = function (error) {
            console.error("EventSource failed:", error);
            eventSource.close();
        };
    });
    function addMathJax() {
        // Check if polyfill script is already present
        var existingPolyfillScript = document.querySelector(
            'script[src="https://polyfill.io/v3/polyfill.min.js?features=es6"]'
        );
        if (existingPolyfillScript) {
            existingPolyfillScript.remove(); // Remove existing script
        }

        // Check if MathJax script is already present
        var existingMathJaxScript = document.querySelector(
            'script[src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"]'
        );
        if (existingMathJaxScript) {
            existingMathJaxScript.remove(); // Remove existing script
        }

        // Add polyfill script
        var polyfillScript = document.createElement("script");
        polyfillScript.src =
            "https://polyfill.io/v3/polyfill.min.js?features=es6";
        document.head.appendChild(polyfillScript);

        // Add MathJax script
        var mathJaxScript = document.createElement("script");
        mathJaxScript.id = "MathJax-script";
        mathJaxScript.src =
            "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
        mathJaxScript.async = true;
        document.head.appendChild(mathJaxScript);
    }

    addMathJax();
});
