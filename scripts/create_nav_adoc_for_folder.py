import sys, getopt
from shutil import copyfile
from os import walk
import os

def main(argv):
    parameters = "p:"
    parameters_long = ["path="]
    path = "../"
    filetypes = ["adoc"]

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into.")

    if not opts:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into.")
        exit(1)

    for opt,arg in opts:
        if opt in ("-p","--path"):
            path = path + arg

    base_level = 1
    current_level = 1
    relative_path_depth = -1
    path_delimiter = ["/","\\"]

    nav_content = ""
    created_files = []

    for (dirpath,dirnames,filenames) in walk(path):
        if(dirpath[-1] not in path_delimiter):
            dirpath = dirpath + "\\"

        if relative_path_depth == -1:
            relative_path_depth = dirpath.count('\\')

        current_level = base_level + dirpath.count('\\') - relative_path_depth

        list_entries = []
        if(dirnames):
            for dname in dirnames:
                fname = dirpath+dname+".adoc"
                with open(fname,'w') as f:
                    f.write("= "+dname+"\n\n== Subpages\n\n")

                created_files.append(fname)
                list_entries.append(dname+".adoc")

        current_relative_path = dirpath.replace(path,'')

        for f in filenames:
            for type in filetypes:
                if f.endswith(type) and not f[0]=="_" and not f in [x+".adoc" for x in dirnames]:
                    list_entries.append(f)
                    break

        list_entries.sort()

        if not current_relative_path:
            for e in list_entries:
                nav_content += "*"*current_level + " xref:" + current_relative_path + e + "[]\n"

        else:
            temp_nav_content = ""
            path_components = current_relative_path.split("\\")
            parent_path = path
            for c in path_components[:-2]:
                parent_path+=c+"/"

            with open(parent_path+path_components[-2]+".adoc","a") as f:
                for e in list_entries:
                    content =  " xref:" + current_relative_path.replace("\\","/") + e + "[]\n"
                    temp_nav_content += "*"*current_level + content
                    f.write("* "+content)

            index = nav_content.find(path_components[-2]+".adoc[]\n") + len(path_components[-2]+".adoc[]\n")
            nav_content = nav_content[:index] + temp_nav_content + nav_content[index:]

    # print(nav_content)
    target = path[:path.rfind("/pages",1)]+"/"
    if os.path.isfile(target+"nav.adoc"):
        copyfile(target+"nav.adoc",target+"nav.adoc1")
    with open(target+"nav.adoc","w") as file:
        file.write(nav_content)


    # Note: This is where antora would create the htmls before this script removes the created files again. Alternatively, the files could stay there and not be deleted, just overwritten every time the script is run...
    # INFO: For now, this is done in a cleanup script afterwards.

    for f in created_files:
        with open(f+"2",'w') as file:
            file.write("delete!")


if __name__ == "__main__":
    main(sys.argv[1:])