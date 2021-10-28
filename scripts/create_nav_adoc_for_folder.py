from posixpath import dirname
import sys, getopt
import os
from os import walk

def main(argv):
    parameters = "p:"
    parameters_long = ["path="]
    path = "../"
    filetypes = ["adoc"]

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into.")

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
                if f.endswith(type) and not f[0]=="_":
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

            print(parent_path+path_components[-2]+".adoc")
            with open(parent_path+path_components[-2]+".adoc","a") as f:
                for e in list_entries:
                    content =  " xref:" + current_relative_path + e + "[]\n"
                    temp_nav_content += "*"*current_level + content
                    f.write("* "+content)

            index = nav_content.find(path_components[-2]+".adoc[]\n") + len(path_components[-2]+".adoc[]\n")
            nav_content = nav_content[:index] + temp_nav_content + nav_content[index:]

    print(nav_content)

    for f in created_files:
        os.remove(f)


if __name__ == "__main__":
    main(sys.argv[1:])