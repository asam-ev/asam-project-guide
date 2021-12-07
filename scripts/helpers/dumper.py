from pathlib import Path

from helpers import constants as C

def dump_content_to_txt(content, filename=C.DEFAULT_OUTPUT_FILENAME, path=C.DEFAULT_OUTPUT_PATH):
    with open(path+filename+".txt","w") as file:
        file.write(content)

def dump_content_to_txt_in_lines(content, filename=C.DEFAULT_OUTPUT_FILENAME, path=C.DEFAULT_OUTPUT_PATH):
    Path(path).mkdir(parents=True, exist_ok=True)
    with open(path+filename+".txt","w") as file:
        file.writelines(content)