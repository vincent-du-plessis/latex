document.addEventListener("DOMContentLoaded", function () {

    const getQuizzesSpinner = document.querySelector(".getQuizzesSpinner");
    function parseAllLatex() {
        let delay = 0;
        document.querySelectorAll(".row").forEach((container) => {
            delay++;
            setTimeout(() => {
                let event = new Event("input");
                container.children[1].dispatchEvent(event);
            }, 10 * delay);
        });
    }
    function adjustTextareaHeight(textarea) {
        document.querySelectorAll("textarea").forEach((textArea) => {
            textArea.style.height = "auto"; 
            textArea.style.height = textArea.scrollHeight + 2 + "px"; 
        });
    }
    let getQuizzesButton = document.getElementById("getQuizzesButton");
    let quizSelectInput = document.getElementById("quizSelectInput");
    let container = document.querySelector(".container");
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

    function parseLatex(e) {
        textAreaValue = e.target.value;
        latexPtag = e.target.parentElement.firstChild;
        latexPtag.innerHTML = textAreaValue;
        convert(textAreaValue, latexPtag);
    }
    function AddImage(
        questionId,
        quizId,
        quizLatex,
        quizImage,
        typeQorA,
        arrayIndex
    ) {
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
        let saveButton = document.createElement("button");
        saveButton.classList.add("btn", "btn-primary", "m-3");
        saveButton.textContent = "Save";
        var spinnerDiv = document.createElement("div");
        spinnerDiv.classList.add("spinner-border");
        spinnerDiv.setAttribute("role", "status");
        var spanElement = document.createElement("span");
        spanElement.classList.add("sr-only");
        spanElement.textContent = "Loading...";
        spinnerDiv.appendChild(spanElement);
        let infoNotice = document.createElement("p");
        infoNotice.classList.add("d-none");
        let infoContainer = document.createElement("div");
        infoContainer.classList.add(
            "d-flex",
            "justify-content-center",
            "align-items-center",
            "container-fluid"
        );
        infoContainer.append(spinnerDiv, infoNotice);
        let saveToFundamanjeButton = document.createElement("button");
        saveToFundamanjeButton.classList.add("btn", "btn-success", "m-3");
        saveToFundamanjeButton.innerText = "Export to fundamanje";
        spinnerDiv.style.display = "none";
        let buttonContainer = document.createElement("div");
        buttonContainer.classList.add(
            "d-flex",
            "justify-content-center",
            "align-items-center",
            "container-fluid"
        );
        saveToFundamanjeButton.addEventListener("click", (e) => {
            spinnerDiv.style.display = "block";
            let questionlatex =
                e.target.parentNode.parentNode.children[1].value;

            const saveParams = {
                latex: questionlatex,
                questionId: questionId,
                typeQorA: typeQorA,
                arrayIndex: arrayIndex,
            };

            const saveLatexUrl = `/save_to_fundamanje`;
            fetch(saveLatexUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(saveParams),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then((data) => {
                    if (data.message === "Data successfully updated") {
                        infoNotice.innerText = `${typeQorA}: ${questionId} Saved to Fundamanje`;
                        infoNotice.classList.remove("d-none");
                        spinnerDiv.style.display = "none";
                    } else if (data.message === "no data") {
                        infoNotice.innerText = `No latex suplied or some problem, ${typeQorA}: ${questionId} not saved to Fundamaje`;
                        infoNotice.classList.remove("d-none");
                    } else {
                        infoNotice.innerText = `${typeQorA}: ${questionId} Not Saved to Fundamanje!`;
                        infoNotice.classList.remove("d-none");
                        spinnerDiv.style.display = "none";
                    }
                });
        });
        let deleteButton = document.createElement("button");
        deleteButton.classList.add("btn", "btn-danger", "m-3");
        deleteButton.innerText = "Delete";

        deleteButton.addEventListener("click", () => {
            var confirmation = window.confirm(
                `Do you want to proceed to Delete ${typeQorA}: ${questionId}?`
            );
            if (confirmation) {
                spinnerDiv.style.display = "block";
                const deleteParams = {
                    questionId: questionId,
                    typeQorA: typeQorA,
                    arrayIndex: arrayIndex,
                };

                fetch("/delete_question", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(deleteParams),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("Network response was not ok");
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (data.message === "Question Deleted") {
                            infoNotice.innerText = `${typeQorA}: ${questionId} Deleted Successfully!`;
                            infoNotice.classList.remove("d-none");
                            spinnerDiv.style.display = "none";
                        } else if (data.message === "Question Not Saved") {
                            infoNotice.innerText = `${typeQorA}: ${questionId} Not Deleted!`;
                            infoNotice.classList.remove("d-none");
                        } else {
                            infoNotice.innerText = `${typeQorA}: ${questionId} Not Deleted!`;
                            infoNotice.classList.remove("d-none");
                            spinnerDiv.style.display = "none";
                        }
                    });
            } else {
                infoNotice.innerText = `${typeQorA}: ${questionId} Not Deleted!`;
                infoNotice.classList.remove("d-none");
                spinnerDiv.style.display = "none";
            }
        });
        saveButton.addEventListener("click", (e) => {
            spinnerDiv.style.display = "block";
            let questionlatex =
                e.target.parentNode.parentNode.children[1].value;
            const latexParams = {
                latex: questionlatex,
                questionId: questionId,
                typeQorA: typeQorA,
                arrayIndex: arrayIndex,
            };

            const saveLatexUrl = `/save_questions`;
            fetch(saveLatexUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(latexParams),
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then((data) => {
                    if (data.message === "Data received") {
                        infoNotice.innerText = `${typeQorA}: ${questionId} saved!`;
                        infoNotice.classList.remove("d-none");
                        spinnerDiv.style.display = "none";
                    } else if (data.message === "no data") {
                        infoNotice.innerText = `No latex suplied or some problem, ${typeQorA}: ${questionId} not saved!`;
                        infoNotice.classList.remove("d-none");
                    } else {
                        infoNotice.innerText = `${typeQorA} Not Saved!`;
                        infoNotice.classList.remove("d-none");
                        spinnerDiv.style.display = "none";
                    }
                });
        });
        let latexPTag = document.createElement("div");
        let textArea = document.createElement("textarea");
        latexPTag.innerHTML = quizLatex;
        let quizImg = document.createElement("img");
        quizImg.setAttribute("src", quizImage);
        quizImg.classList.add("border", "border-dark", "mb-3");
        let h4 = document.createElement("h4");
        h4.textContent = `${typeQorA}: ${questionId}`;
        textArea.value = quizLatex;
        textArea.setAttribute("typeQorA", typeQorA);
        textArea.setAttribute("arrayIndex", arrayIndex);

        textArea.classList.add("p-2", "col-12");
        latexPTag.classList.add("p-1", "col-12", "mb-2");
        textArea.addEventListener("input", (e) => {
            parseLatex(e);
        });
        textAreaValue = textArea.value;
        buttonContainer.append(
            saveButton,
            deleteButton,
            saveToFundamanjeButton
        );
        quizContainer.append(
            latexPTag,
            textArea,
            buttonContainer,
            infoContainer
        );

        parentContainer.append(h4, quizImg, quizContainer);
        container.append(parentContainer);
    }
    let quizesOnPage = 0;
    let intersectionTrigger = document.createElement("div");
    intersectionTrigger.width = "100px";
    intersectionTrigger.height = "100px";
    intersectionTrigger.background = "red";
    intersectionTrigger.classList.add("intersectionTrigger");
    container.append(intersectionTrigger);

    const getImagesAndLatex = () => {
        getQuizzesSpinner.classList.remove("d-none");
        quizOption = {
            quizNumber: quizSelectInput.value,
            quizesOnPage: quizesOnPage,
        };
        const baseUrl = "/quiz_data";
        const params = {
            quiz: quizOption,
        };
        const searchParams = new URLSearchParams(
            `quizNumber=${quizSelectInput.value}&quizesOnPage=${quizesOnPage}`
        );
        const fetchUrl = `${baseUrl}?${searchParams}`;
        fetch(fetchUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                if (data.length === 0) {
                    container.innerHTML = "No data available";
                }

                data.forEach((quiz) => {
                    quizesOnPage++;
                    question_id = quiz.question_id;
                    question_image_src = JSON.parse(quiz.question_image_src);
                    question_latex_equation = JSON.parse(
                        quiz.question_latex_equation
                    );
                    answer_image_src = JSON.parse(quiz.answer_image_src);
                    answer_latex_equation = JSON.parse(
                        quiz.answer_latex_equation
                    );
                    quiz_id = quiz.quiz_id;
                    if (
                        question_image_src !== null &&
                        question_image_src !== "undefined"
                    ) {
                        for (let i = 0; i < question_image_src.length; i++) {
                            let typeQorA = "Question";
                            quizImage = question_image_src[i];
                            quiestionId = question_id;
                            quizId = quiz_id;
                            quizLatex = question_latex_equation;
                            questionId = question_id;
                            AddImage(
                                questionId,
                                quizId,
                                quizLatex,
                                quizImage,
                                typeQorA,
                                i
                            );
                        }
                    }

                    if (
                        answer_image_src !== null &&
                        answer_image_src !== "undefined"
                    ) {
                        for (let i = 0; i < answer_image_src.length; i++) {
                            let typeQorA = "Answer";
                            quizImage = answer_image_src[i];
                            questionId = question_id;
                            quizId = quiz_id;
                            quizLatex = answer_latex_equation;
                            AddImage(
                                questionId,
                                quizId,
                                quizLatex,
                                quizImage,
                                typeQorA,
                                i
                            );
                        }
                    }
                });
            })
            .then(() => {
                const intersectionTriggerCheck = document.querySelector(
                    ".intersectionTrigger"
                );
                if (intersectionTriggerCheck) {
                    container.append(intersectionTrigger);
                }
                getQuizzesSpinner.classList.add("d-none");
                adjustTextareaHeight();
                setTimeout(() => {
                    parseAllLatex();
                }, 2000);
            })
            .catch((error) => {
                getQuizzesSpinner.classList.add("d-none");
                console.error("Fetch error:", error);
            });
    };
    addMathJax();
    getQuizzesButton.addEventListener("click", () => {
        getQuizzesSpinner.classList.remove("d-none");
        getImagesAndLatex();

        const options = {
            root: null, // Use the viewport as the root
            rootMargin: "1000px", // No margin
            threshold: 0, // Trigger when 50% of the image is visible
        };

        // Intersection Observer callback function
        const callback = (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    getImagesAndLatex(observer);
                }
            });
        };
        const observer = new IntersectionObserver(callback, options);
        observer.observe(intersectionTrigger);
    });
    const searchButton = document.getElementById("searchButton");
    const searchInput = document.getElementById("searchInput");
    searchButton.addEventListener("click", () => {
        let searchInputValue = searchInput.value;
        console.log("search")
        const baseUrl = "/search_question";

        const searchParams = new URLSearchParams(
            `searchValue=${searchInputValue}`
        );
        const fetchUrl = `${baseUrl}?${searchParams}`;
        fetch(fetchUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then((data) => {
                console.log(data)
            })
            .then(() => {

            })
            .catch((error) => {
                console.error("Fetch error:", error);
            });
    })
});
