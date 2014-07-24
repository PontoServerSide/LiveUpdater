/**
 * Git Checker
 * Developed by Namyun Kim <skadvs@gmail.com>
 * This program developed using libgit2.
 */
#include <stdio.h>
#include <stdbool.h>
#include <git2.h>
#include <git2/clone.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>

#define LOGGER

#define NO_ERROR    0

void interval_fetch_handler(int signum) {

}

void git_error_handler(int error) {
    if (error<0) {
        const git_error *e = giterr_last();
        fprintf(stderr,"Error %d/%d: %s\n", error, e->klass, e->message);
        exit(-1);
    }
}

int get_latest_commit(git_repository *repo, git_remote *remote, char *buf) {
    const git_remote_head **remote_heads = NULL;
    
    size_t count = 0;
    size_t i = 0;
    int error;
    if ((error = git_remote_ls(&remote_heads, &count, remote))<0) {
        return error;
    }

    for (; i<count; ++i) {
        const git_remote_head *head = remote_heads[i];
        if(strstr(head->name,"HEAD")!=NULL) {
            git_oid oid;
            if ((error = git_reference_name_to_id(&oid, repo, "HEAD"))<0) {
                return error;
            }

            git_commit *commit;
            if ((error = git_commit_lookup(&commit, repo, &oid))<0) {
                return error;
            }

            const git_oid *commit_id = git_commit_id(commit);   // Get commit id
            git_oid_tostr(buf, sizeof(buf), commit_id);         // Convert heximal commit id to string

            return 0;
        }
    }

    return 0;
}

int main(int argc, char** argv) {
    git_repository *repo = NULL;
    git_remote *remote = NULL;
    int error;

    struct sigaction sa;
    struct itimerval timer;

    if (argc != 3) {
        fprintf(stderr,"Usage: %s [path] [url]\n", argv[0]);
        return -1;
    }

    // initialize timer
    memset(&sa,0,sizeof(sa));
    sa.sa_handler = &interval_fetch_handler;
    sigaction(SIGVTALAM,&sa,NULL);

    // set timer interval
    timer.it_value.tv_sec = 10;
    timer.it_interval.tv_sec = 10;

    setitimer(ITIMER_VIRTUAL,&timer,NULL);

    git_error_handler(git_clone(&repo, argv[2], argv[1], NULL));    

    git_error_handler(git_remote_load(&remote, repo, "origin"));

    git_error_handler(git_remote_connect(remote, GIT_DIRECTION_FETCH));
    int connected = git_remote_connected(remote);

    char buf[GIT_OID_HEXSZ + 1];
    git_error_handler(get_latest_commit(repo, remote, buf));

    printf("Last commit: %s\n", buf);

    return 0;
}