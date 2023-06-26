import json
import boto3
from dateutil import parser

supported_file_types = ["audio/aac", "audio/mp3", "application/x-abiword", "image/avif", "video/x-msvideo", "image/bmp", "application/x-cdf",
"text/css","text/csv","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/gif","text/html",
"image/vnd.microsoft.icon","image/jpeg","application/json","audio/midi","audio/x-midi","audio/mpeg","video/mp4","video/mpeg",
"application/vnd.oasis.opendocument.presentation","application/vnd.oasis.opendocument.spreadsheet","application/vnd.oasis.opendocument.text",
"audio/ogg","video/ogg","audio/opus","application/ogg","image/png","application/pdf","application/vnd.ms-powerpoint",
"application/vnd.openxmlformats-officedocument.presentationml.presentation","application/rtf","image/svg+xml","image/tiff","video/mp2t","text/plain",
"audio/wav","audio/x-wav","audio/webm","video/webm","image/webp","application/vnd.ms-excel","application/xhtml+xml",
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/xml","text/xml", "image/jpg", "txt", "ppt", "pptx", "doc", "docx"]

def generate_presigned_post(object_key, expires_in):
    s3 = boto3.client('s3')
    bucket_name = 'najbolji-bucket-ikada'

    try:
        response = s3.generate_presigned_post(
            Bucket=bucket_name,
            Key=object_key,
            ExpiresIn=expires_in)
    except:
        raise
    return response

def generate_presigned_put(object_key, expires_in):
    s3 = boto3.client('s3')
    bucket_name = 'najbolji-bucket-ikada'
    try:
        response = s3.generate_presigned_url(
            ClientMethod = 'put_object',
            ExpiresIn = expires_in, 
            Params = {'Bucket': bucket_name, 'Key': object_key})
    except:
        raise
    return response

def isfloat(num):
    try:
        float(num)
        return True
    except ValueError:
        return False

def s3_trigger(event, context):
    dynamodb = boto3.client('dynamodb')
    for record in event['Records']:
        file_key = str(record['s3']['object']['key']).replace("+", " ")

        dynamodb.update_item(
            TableName='s-metadata',
            Key={
                'partial_path': {'S': file_key}
            },
            UpdateExpression='SET valid = :value',
            ExpressionAttributeValues={
                ':value': {'S': 'yes'}
            }
        )

def generate_s3_url(event, context):
    name = event['file_name']
    type = event['type']
    size = int(event['size'])
    creation_date = event['creation_date']
    last_modification_date = event['last_modification_date']
    username = event['username']

    if(type not in supported_file_types):
        raise Exception("Bad request: File type is not supported!")

    if(size > 52428800):
        raise Exception("Bad request: File too large!")

    s3 = boto3.resource('s3')
    bucket_name = 'najbolji-bucket-ikada'
    
    bucket = s3.Bucket(bucket_name)
    object_keys = [obj.key for obj in bucket.objects.all()]
    path = username + '/' + name
    
    if path in object_keys:
        raise Exception("Bad request: file with the same name already exists!")
    
    item = {
        "partial_path" : username + "/" + name,
        "file_name" : str(name),
        "type" : str(type),
        "size" : str(size),
        "creation_date" : str(creation_date),
        "last_modification_date" : str(last_modification_date),
        "valid" : "no"
    }

    for key, value in event.items():
        if key in ['file_name', 'username', 'type', 'size', 'creation_date', 'last_modification_date']:
            continue

        if isfloat(value):
            item[key] = str(value)
        else:
            item[key] = value

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('s-metadata')
    table.put_item(Item=item)
    return generate_presigned_post(path, 3600)

def get_user_data(event, context):
    username = event['query']['username']
    album = event['query']['album']
    items = []
    s3client = boto3.client('s3')
    s3bucket = boto3.resource('s3')
    my_bucket = s3bucket.Bucket('najbolji-bucket-ikada')
    
    dynamodb = boto3.client('dynamodb')
    key = {"partial_path": {"S" : ""} }

    prefix = username + "/"
    if(album != '0'):
        prefix += album + "/" 
    for object_summary in my_bucket.objects.filter(Prefix=prefix):
        tokens = object_summary.key.split('.')
        extension = tokens[len(tokens) - 1]
        typeArr = [x for x in supported_file_types if extension in x]
        type = ""
        if(len(typeArr) == 0):
            type = "FOLDER"
        else:
            type = typeArr[0].split("/")[0].upper()
        key['partial_path']["S"] = object_summary.key

        item = dynamodb.get_item(TableName='s-metadata', Key=key)['Item']
        date_created_str = item['creation_date']['S']
        try:
            valid = item['valid']['S']
            if valid == 'no':
                continue
        except:
            pass

        date_created = parser.isoparse(date_created_str)
        path = username + "/" + object_summary.key
        url = s3client.generate_presigned_url(ClientMethod = 'get_object', Params = { 'Bucket': 'najbolji-bucket-ikada', 'Key': object_summary.key })

        items.append( {
            "file":object_summary.key,
            "type":type,
            "date_created":date_created,
            "url":url
        })
    items.sort(key=lambda x: x['date_created'], reverse=True)
    for item in items:
        item['date_created'] = item['date_created'].strftime("%Y-%m-%d %H:%M:")
    return json.dumps(items)

def get_file_metadata(event, context):
    file_path = event['query']['file_path']
    username = event['query']['username']
    owner_username = file_path.split('/')[0]
    if username != owner_username:
        return {
                'statusCode': 400,
                'body': json.dumps('Cannot view files that are not your own!')
                }
    dynamodb = boto3.client('dynamodb')
    key = {"partial_path": {"S" : file_path} }
    file_info = dynamodb.get_item(TableName='s-metadata', Key=key)
    if file_info.get("Item") is None:
        return {
                'statusCode': 404,
                'body': json.dumps('The file does not exist!')
                }
    file_info = file_info['Item']
    item = {}
    for key, value in file_info.items():
        item[key] = value['S']
    return json.dumps(item)

def modify_metadata(event,context):
    dynamodb = boto3.client('dynamodb')
    username = event['username']
    
    file_path = event['partial_path']
    key = {"partial_path": {"S" : file_path} }
    
    file_name = event['file_name']
    file_type = event['type']
    
    if username != file_path.split("/")[0]:
        raise Exception("Bad request: You are not the file's owner!")
            
    response = dynamodb.get_item(TableName='s-metadata', Key=key)
    
    if 'Item' in response:
        real_file_name = response['Item']['file_name']['S']
        if real_file_name != file_name:
            raise Exception('Bad request: File name does not match!')
        
        real_file_type = response['Item']['type']['S']
        if real_file_type != file_type:
            raise Exception('Bad request: File type does not match!')
        item = {}

        for key, value in event.items():
            if key == 'username':
                continue
            item[key] = {'S' : value}
        dynamodb.put_item(TableName='s-metadata', Item=item)
        return {
            'statusCode': 200,
            'body': json.dumps('Successfully modified the file!')
        }
        
    else:
        raise Exception('Not found: The file does not exist!')
    
def full_modify_item(event, context):
    dynamodb = boto3.client('dynamodb')
    file_name = event['file_name']
    file_path = event['partial_path']
    key = {"partial_path": {"S" : file_path} }
    file_type = event['type']
    file_size = int(event['size'])
    username = event['username']

    if(file_type not in supported_file_types):
        raise Exception("Bad request: File type is not supported!")

    if(file_size > 52428800):
        raise Exception("Bad request: File too large!")
        
    if username != file_path.split("/")[0]:
        raise Exception("Bad request: You are not the file's owner!")
            
    response = dynamodb.get_item(TableName='s-metadata', Key=key)
    
    if 'Item' in response:
        real_file_name = response['Item']['file_name']['S']
        if real_file_name != file_name:
            raise Exception('Bad request: File name does not match!')
        
        real_file_type = response['Item']['type']['S']
        if real_file_type != file_type:
            raise Exception('Bad request: File type does not match!')
        item = {}

        for key, value in event.items():
            if key == 'username':
                continue
            item[key] = {'S' : value}
        dynamodb.put_item(TableName='s-metadata', Item=item)
        return generate_presigned_put(file_path, 3600)
        
    else:
        raise Exception('Not found: The file does not exist!')
