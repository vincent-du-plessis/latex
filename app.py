import os
from PIL import Image
from pix2tex.cli import LatexOCR
from flask import Flask, render_template, Response, request, jsonify, url_for
import mysql.connector
from bs4 import BeautifulSoup
import requests
import tempfile
import json
import mysql.connector
import html
app = Flask(__name__)
import db_config

def update_value_after_key(input_string, key, new_value):
    index_key = input_string.find(key)
    if index_key == -1:
        return None 
    index_colon = input_string.find(':', index_key)
    if index_colon == -1:
        return None  
    index_quote = input_string.find('"', index_colon)
    if index_quote == -1:
        return None  
    index_end_quote = input_string.find('"', index_quote + 1)
    if index_end_quote == -1:
        return None  
    length_str = input_string[index_colon + 1:index_quote]
    value_str = input_string[index_quote + 1:index_end_quote]
    if "Question" in value_str:
        new_length = len(new_value)
        updated_length_str = f'{new_length}:'
        updated_string = input_string[:index_colon + 1] + updated_length_str + '"' + new_value + input_string[index_end_quote:] 
    else:
        new_length = len(new_value + value_str)
        updated_length_str = f'{new_length}:'
        updated_string = input_string[:index_colon + 1] + updated_length_str + '"' + new_value + value_str + input_string[index_end_quote:]

    return updated_string

def connect_to_database():
    try:
        connection = mysql.connector.connect(
            host=db_config.host,
            user=db_config.user,
            password=db_config.password,
            database=db_config.database,
            port=db_config.port,
            charset=db_config.charset
        )

        if connection.is_connected():
            print("Connected to the database")
            # Perform database operations here
            # For example, execute queries, fetch data, etc.
            return connection
        else:
            print("Failed to connect to the database")
            return None

    except mysql.connector.Error as e:
        print("Error connecting to MySQL:", e)
        return None

def check_if_table_exists():
    connection = connect_to_database()
    cursor = connection.cursor()
    create_table_query = """
    CREATE TABLE IF NOT EXISTS generated_latex (
        question_id INT,
        quiz_id INT,
        answer_latex_equation TEXT,
        answer_image_src TEXT,
        question_latex_equation TEXT,
        question_image_src TEXT,
        PRIMARY KEY (question_id)
    )
    """

    cursor.execute(create_table_query)
    connection.commit()
    connection.close()
    cursor.close()

check_if_table_exists()

def get_quizes():
    connection = connect_to_database()
    cursor = connection.cursor()
    query = "SELECT quiz_id, quiz_name FROM wp_mlw_quizzes"
    cursor.execute(query)
    quizzes = [] 
    
    for row in cursor.fetchall():
        quiz_id, quiz_name = row
        quiz = {'quiz_id': quiz_id, 'quiz_name': quiz_name}
        quizzes.append(quiz)  
    return quizzes

def addAnswerDataToDatabase(data):
    insert_query = """
    INSERT INTO generated_latex (question_id, quiz_id, answer_latex_equation, answer_image_src)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE answer_latex_equation = VALUES(answer_latex_equation), answer_image_src = VALUES(answer_image_src);
    """
    connection = connect_to_database()
    cursor = connection.cursor()
    cursor.execute(insert_query, data)
    connection.commit()  

def addQuestionDataToDatabase(data):
    insert_query2 = """
    UPDATE generated_latex
    SET question_latex_equation = %s, question_image_src = %s
    WHERE question_id = %s
    """
    connection = connect_to_database()
    cursor = connection.cursor()
    cursor.execute(insert_query2, data)
    connection.commit() 
    cursor.close()
    connection.close()

def get_quiz_image_count(quizId):
    count = 0
    connection = connect_to_database()
    cursor = connection.cursor()
    query = "SELECT COUNT(*) FROM wp_mlw_questions WHERE quiz_id = %s;"
    cursor.execute(query, (quizId,))
    result = cursor.fetchone()
    total_rows = result[0]
    connection.close()
    cursor.close()
    return total_rows

def get_proccessed_quiz_image_count(quizId):
    connection = connect_to_database()
    cursor = connection.cursor()
    query = "SELECT COUNT(*) FROM generated_latex WHERE quiz_id = %s;"
    cursor.execute(query, (quizId,))
    result = cursor.fetchone()
    total_rows = result[0]
    connection.close()
    cursor.close()
    return total_rows

def search_quiz_data(search_value):
    print("helllo")

@app.route('/events')
def events():
    quizId = request.args.get('quizId')
    def process_quiz_images(quizId):
        process_progress = 0
        connection = connect_to_database()
        cursor = connection.cursor()
        query = """SELECT q.quiz_id, q.question_answer_info, q.question_name, q.question_id
                FROM wp_mlw_questions q
                LEFT JOIN generated_latex g ON q.question_id = g.question_id
                WHERE q.quiz_id = %s AND g.question_id IS NULL
                ORDER BY q.question_id;
                """
        answerLatexArray = []
        answerImageArray = []
        questionLatexArray = []
        questionImageArray = []    
        cursor.execute(query, (quizId,))

        for row in cursor.fetchall():
            answerLatexArray = []
            answerImageArray = []
            questionLatexArray = []
            questionImageArray = []
            row_id, question_answer_info, quiestion_name, question_id = row   
            soup = BeautifulSoup(question_answer_info, 'html.parser')
            images = soup.find_all('img')  
            processed_count = get_proccessed_quiz_image_count(quizId)
            total_count = get_quiz_image_count(quizId) 
            
            if total_count > 0:
                process_progress = (processed_count / total_count) * 100
            else:
                process_progress = 0

            process_progress = round(process_progress, 2)  
            for img_tag in images:
                image_src = img_tag['src']
                response = requests.get(image_src)
                if response.status_code == 200:                
                        if response.content and len(response.content) > 0:
                            try:
                                with tempfile.NamedTemporaryFile(suffix='.png') as tmp_file:  
                                    tmp_file.write(response.content)                              
                                    img = Image.open(tmp_file.name)
                                    model = LatexOCR()
                                    latex_equation = model(img)
                                    message = {
                                        "latex_equation": latex_equation,
                                        "image_src": image_src,
                                        "row_id": question_id,
                                        "process_progress": process_progress
                                    }     
                                    answerLatexArray.append(latex_equation)
                                    answerImageArray.append(image_src)
                                    data_str = json.dumps(message)                                                            
                                    yield f"data: {data_str}\n\n"
                                yield f"data: {data_str}\n\n"         
                            except Exception as e:
                                print("Error processing image:", e)
                        else:
                            print("Response content is empty or has zero length")
                else:
                    print('Failed to fetch the image:', response.status_code)
            answerdata = (int(question_id), int(quizId),  json.dumps(answerLatexArray), json.dumps(answerImageArray))
            addAnswerDataToDatabase(answerdata)
            decoded_question_name = html.unescape(quiestion_name)
            soup2 = BeautifulSoup(decoded_question_name, 'html.parser')
            images2 = soup2.find_all('img')
            for img_tag in images2:
                    image_src = img_tag['src']
                    response = requests.get(image_src)
                    if response.status_code == 200:                
                            if response.content and len(response.content) > 0:
                                try:
                                    with tempfile.NamedTemporaryFile(suffix='.png') as tmp_file:  
                                        tmp_file.write(response.content)                              
                                        img = Image.open(tmp_file.name)
                                        model = LatexOCR()
                                        latex_equation = model(img)
                                        message = {
                                            "latex_equation": latex_equation,
                                            "image_src": image_src,
                                            "row_id": question_id,
                                            "process_progress": process_progress
                                        }
                                        questionLatexArray.append(latex_equation)
                                        questionImageArray.append(image_src)                                      
                                        data_str = json.dumps(message)                                                        
                                        yield f"data: {data_str}\n\n"
                                    yield f"data: {data_str}\n\n"         

                                except Exception as e:
                                    print("Error processing image:", e)
                            else:
                                print("Response content is empty or has zero length")
                    else:
                        print('Failed to fetch the image:', response.status_code)
            questiondata = (json.dumps(questionLatexArray), json.dumps(questionImageArray), int(question_id))
            addQuestionDataToDatabase(questiondata)
        answerLatexArray = []
        answerImageArray = []
        questionLatexArray = []
        questionImageArray = []
        connection.close()
        cursor.close()
    return Response(process_quiz_images(quizId), mimetype='text/event-stream')
       
def get_quiz_data(quiz_id, quizes_on_page):
    quizezAvail = get_proccessed_quiz_image_count(quiz_id)
  
    if  quizezAvail > int(quizes_on_page): 
        limit = 5
        connection = connect_to_database()
        cursor = connection.cursor()
        select_query = """
            SELECT question_id, answer_latex_equation, answer_image_src, 
            question_latex_equation, question_image_src, quiz_id 
            FROM generated_latex 
            WHERE quiz_id = %s
            LIMIT %s, %s
        """
        cursor.execute(select_query, (int(quiz_id), int(quizes_on_page), int(limit)))
        rows = cursor.fetchall()
        column_names = [column[0] for column in cursor.description]  # Get column names
        
        result = []
        for row in rows:
            row_data = {}
            for i, value in enumerate(row):
                column_name = column_names[i]
                row_data[column_name] = value
            result.append(row_data)
        cursor.close()
        return result
    
@app.route('/search_question', methods=['GET'])
def search_quiz_data_route():
    search_value = request.args.get('searchValue')
    quiz_data = search_quiz_data(search_value)       
    return jsonify(quiz_data)
   
@app.route('/process_images')
def process_images():
    quizzes = get_quizes()
    return render_template('process_images.html', js_file=url_for('static', filename='js/process_images.js'), quizzes = quizzes)

@app.route('/quiz_data', methods=['GET'])
def get_quiz_data_route():
    quizes_on_page = request.args.get('quizesOnPage')
    quiz_id = request.args.get('quizNumber')
    quiz_data = get_quiz_data(quiz_id, quizes_on_page)
    return jsonify(quiz_data)

@app.route('/save_questions', methods=['PUT'])
def save_question():
    data = request.get_json()
    question_id = data.get('questionId')
    latex = data.get('latex')
    typeQorA = data.get('typeQorA')
    arrayIndex = int(data.get('arrayIndex'))

    if typeQorA == "Question":
        latexColumn = "question_latex_equation"
        imgColumn = "question_image_src"
    elif typeQorA == "Answer":
        latexColumn = "answer_latex_equation"
        imgColumn = "answer_image_src"
    else:
        latexColumn = "undefined"

    for key, value in data.items():
        if value is None or value == "" or value == "undefined" or value == "null":
            return jsonify({"message": "no data"})
        
    select_query = f"""
        SELECT {latexColumn}, {imgColumn}
        FROM generated_latex 
        WHERE question_id = %s
    """
    connection = connect_to_database()
    cursor = connection.cursor()
    cursor.execute(select_query, (question_id,))
    row = cursor.fetchall()
    if row:
        tuple_one = row[0][0]
        tuple_two = row[0][1]
        latex_array = json.loads(tuple_one)
        latex_array[arrayIndex] = latex
        update_query = f"""
            UPDATE generated_latex
            SET {latexColumn} = %s
            WHERE question_id = %s
        """
        updated_latex_array = json.dumps(latex_array)

    connection = connect_to_database()
    cursor = connection.cursor()
    cursor.execute(update_query, (updated_latex_array , question_id))
    connection.commit()
    cursor.close()
    response_data = {'message': 'Data received'}
    return jsonify(response_data)


@app.route('/save_to_fundamanje', methods=['PUT'])
def save_question_to_fundamaje():
    data = request.get_json()
    latex_equation = data.get('latex')
    question_id = data.get('questionId')
    typeQorA = data.get('typeQorA')
    arrayIndex = data.get('arrayIndex')
    if typeQorA == "Question":
        imgLatexColumn = "question_name"
    elif typeQorA == "Answer":
        imgLatexColumn = "question_settings"
    else:
        imgLatexColumn = "undefined"
    
    if not (latex_equation and question_id and typeQorA):
        return jsonify({"message": "No valid data provided"})
    connection = connect_to_database()
    cursor = connection.cursor()
    query = f"SELECT {imgLatexColumn} FROM wp_mlw_questions WHERE question_id = %s"
    cursor.execute(query, (question_id,))
    row = cursor.fetchone()
    if imgLatexColumn == "question_name":
        if row:
            quiestion_name = row[0]
            decoded_question_name = html.unescape(quiestion_name)
            soup2 = BeautifulSoup(decoded_question_name, 'html.parser')
            images2 = soup2.find_all('img')
            images2[arrayIndex].replace_with(latex_equation)
            update_query = "UPDATE wp_mlw_questions SET question_name = %s WHERE question_id = %s"
            html_string = str(soup2)
            cursor.execute(update_query, (html_string, question_id))
            connection.commit()
            cursor.close()
            connection.close()
            return jsonify({"message": "Data successfully updated"})
    updated_serialized_data = ""
    if imgLatexColumn == "question_settings":       
        if row:
            serialized_array = row[0]          
            updated_php_array = update_value_after_key(serialized_array, 'question_title', latex_equation)
            if updated_php_array is None:
                updated_serialized_data += latex_equation 
            else:
               updated_serialized_data = updated_php_array
            update_query = "UPDATE wp_mlw_questions SET question_settings = %s WHERE question_id = %s"
            cursor.execute(update_query, (updated_serialized_data, question_id))
            connection.commit()
            cursor.close()
            connection.close()  
            return jsonify({"message": "Data successfully updated"})
        else:
            cursor.close()
            connection.close()
            return jsonify({"message": "Question not found"})
            
@app.route('/delete_question', methods=['DELETE'])
def delete_questions():
    data = request.get_json()
    for key, value in data.items():
        if value is None or value == "" or value == "undefined" or value == "null":
            return jsonify({"message": "Question Not Deleted"})
        
    question_id = data.get('questionId')
    typeQorA = data.get('typeQorA')

    if typeQorA == "Question":
        latexColumn = "question_latex_equation"
        imgColumn = "question_image_src"
    elif typeQorA == "Answer":
        latexColumn = "answer_latex_equation"
        imgColumn = "answer_image_src"
    else:
        latexColumn = "undefined"

    arrayIndex = int(data.get('arrayIndex'))
    select_query = f"""
        SELECT {latexColumn}, {imgColumn}
        FROM generated_latex 
        WHERE question_id = %s
    """
    connection = connect_to_database()
    cursor = connection.cursor()
    cursor.execute(select_query, (question_id,))
    row = cursor.fetchall()

    if row:
        tuple_one = row[0][0]
        tuple_two = row[0][1]
        latex_array = json.loads(tuple_one)
        img_array = json.loads(tuple_two)
        del latex_array[arrayIndex]
        del img_array[arrayIndex]
        update_query = f"""
            UPDATE generated_latex
            SET {latexColumn} = %s,
            {imgColumn} = %s
            WHERE question_id = %s
        """
        updated_latex_array = json.dumps(latex_array)
        updated_img_array = json.dumps(img_array)
        cursor.execute(update_query, (updated_latex_array, updated_img_array, question_id))
        connection.commit()
        connection.close()
        cursor.close()
    response_data = {'message': 'Question Deleted'}
    return jsonify(response_data)

@app.route('/validate_images')
def validate_images():
    quizzes = get_quizes()
    return render_template('validate_images.html', js_file=url_for('static', filename='js/validate_images.js'), quizzes = quizzes)

@app.route('/')
def home():
    quizzes = get_quizes()
    return render_template('validate_images.html', js_file=url_for('static', filename='js/validate_images.js'), quizzes = quizzes)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
